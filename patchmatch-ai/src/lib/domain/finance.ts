import "server-only";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { audit } from "@/lib/audit";
import { alertAdmins, notify, orgUserIds } from "@/lib/notifications";
import { newInvoiceNumber } from "@/lib/rfq/refs";
import { providerByName } from "@/lib/services/payments";
import { creditWallet } from "@/lib/domain/unlock";
import { DomainError } from "@/lib/domain/rfq";
import type { DisputeReason } from "@/generated/prisma/client";

export const CLAIM_WINDOW_DAYS = 7;

/** Seller files a quality claim on an unlocked RFQ (RFQ Quality Policy). */
export async function fileDispute(args: { sellerId: string; userId: string; unlockId: string; reason: DisputeReason; description: string; evidenceIds?: string[] }) {
  const unlock = await prisma.rfqUnlock.findUniqueOrThrow({ where: { id: args.unlockId }, include: { disputes: true } });
  if (unlock.sellerId !== args.sellerId) throw new DomainError("FORBIDDEN", "Not your purchase.");
  if (unlock.status !== "ACTIVE") throw new DomainError("INVALID", "This purchase was already refunded or credited.");
  if (unlock.method === "COMPLIMENTARY") throw new DomainError("INVALID", "Complimentary unlocks are not eligible for credit.");
  if (Date.now() - unlock.createdAt.getTime() > CLAIM_WINDOW_DAYS * 86_400_000) throw new DomainError("WINDOW", `Claims must be filed within ${CLAIM_WINDOW_DAYS} days of purchase.`);
  if (unlock.disputes.some((d) => d.status === "OPEN" || d.status === "UNDER_REVIEW")) throw new DomainError("DUPLICATE", "A claim is already open for this purchase.");
  if (args.description.trim().length < 20) throw new DomainError("INVALID", "Please describe the problem (at least 20 characters).");
  const dispute = await prisma.$transaction(async (tx) => {
    const d = await tx.dispute.create({ data: { unlockId: unlock.id, sellerId: args.sellerId, reason: args.reason, description: args.description.trim() } });
    if (args.evidenceIds?.length) await tx.attachment.updateMany({ where: { id: { in: args.evidenceIds }, uploaderUserId: args.userId, purpose: "DISPUTE_EVIDENCE", status: "READY" }, data: { disputeId: d.id } });
    await audit(args.userId, "dispute.file", "Dispute", d.id, { unlockId: unlock.id, reason: args.reason }, tx);
    return d;
  });
  await alertAdmins("Refund/credit claim", `New quality claim (${args.reason.toLowerCase().replace(/_/g, " ")}).`, `/admin/disputes/${dispute.id}`, `dispute:${dispute.id}`, ["SUPER_ADMIN", "ADMIN", "FINANCE"]);
  return dispute;
}

/** Admin decision. Credit → wallet; refund → original payment via provider (falls back to credit if unsupported). */
export async function decideDispute(args: { adminId: string; disputeId: string; decision: "CREDIT" | "REFUND" | "REJECT"; note: string }) {
  if (args.note.trim().length < 5) throw new DomainError("INVALID", "Record the reason for the decision.");
  const d = await prisma.dispute.findUniqueOrThrow({ where: { id: args.disputeId }, include: { unlock: { include: { payment: true, rfq: true } }, seller: true } });
  if (d.status !== "OPEN" && d.status !== "UNDER_REVIEW") throw new DomainError("DECIDED", "This claim has already been decided.");
  const u = d.unlock;

  let refundRef: string | null = null;
  let method: "CREDIT" | "ORIGINAL_PAYMENT" = "CREDIT";
  if (args.decision === "REFUND") {
    if (u.method !== "CARD" || !u.payment?.providerRef) throw new DomainError("INVALID", "Only card purchases can be refunded to the original payment method. Issue a credit instead.");
    const provider = providerByName(u.payment.provider);
    if (!provider?.configured || !provider.capabilities.refunds) throw new DomainError("UNSUPPORTED", `${u.payment.provider} refunds are not available. Issue a credit instead.`);
    const r = await provider.refund({ providerRef: u.payment.providerRef, amountMinor: u.priceMinor, idempotencyKey: `refund:${d.id}` });
    if (r.status === "FAILED") throw new DomainError("PROVIDER", "The payment provider rejected the refund. No changes were made.");
    refundRef = r.refundRef;
    method = "ORIGINAL_PAYMENT";
  }

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.dispute.findUniqueOrThrow({ where: { id: d.id } });
    if (fresh.status !== "OPEN" && fresh.status !== "UNDER_REVIEW") throw new DomainError("DECIDED", "This claim has already been decided.");
    if (args.decision === "REJECT") {
      await tx.dispute.update({ where: { id: d.id }, data: { status: "REJECTED", decision: args.note, decidedById: args.adminId, decidedAt: new Date() } });
    } else {
      const refund = await tx.refund.create({
        data: { unlockId: u.id, paymentId: u.paymentId, disputeId: d.id, method, status: "PROCESSED", amountMinor: u.priceMinor, currency: u.currency, reason: args.note, providerRef: refundRef, decidedById: args.adminId, processedAt: new Date() },
      });
      if (method === "CREDIT") {
        await creditWallet(tx, { orgId: d.seller.orgId, amountMinor: u.priceMinor, currency: u.currency, type: "REFUND_CREDIT", refundId: refund.id, unlockId: u.id, memo: `Credit for claim on ${u.rfq.publicRef}`, idempotencyKey: `dispute-credit:${d.id}`, createdById: args.adminId });
      } else if (u.paymentId) {
        await tx.payment.update({ where: { id: u.paymentId }, data: { status: "REFUNDED" } });
        await tx.paymentAttempt.create({ data: { paymentId: u.paymentId, fromStatus: "PAID", toStatus: "REFUNDED", source: "admin_refund", providerRef: refundRef } });
      }
      // Seller keeps the information already disclosed; the unlock is marked so revenue reports net it out.
      await tx.rfqUnlock.update({ where: { id: u.id }, data: { status: method === "CREDIT" ? "CREDITED" : "REFUNDED" } });
      await tx.dispute.update({ where: { id: d.id }, data: { status: method === "CREDIT" ? "RESOLVED_CREDIT" : "RESOLVED_REFUND", decision: args.note, decidedById: args.adminId, decidedAt: new Date() } });
    }
    await audit(args.adminId, `dispute.${args.decision.toLowerCase()}`, "Dispute", d.id, { unlockId: u.id, amountMinor: u.priceMinor, note: args.note }, tx);
  });

  const label = args.decision === "REJECT" ? "Claim not upheld" : args.decision === "CREDIT" ? `Credit issued (${formatMoney(u.priceMinor, u.currency)})` : `Refund issued (${formatMoney(u.priceMinor, u.currency)})`;
  await notify({
    userIds: await orgUserIds(d.seller.orgId), type: "dispute_decision", title: `Claim decision: ${label}`, body: args.note, link: "/seller/quality-claims",
    dedupeKey: `dispute_decision:${d.id}`, email: { template: "dispute_decision", data: { ref: u.rfq.publicRef, decision: label, note: args.note, url: siteUrl("/seller/quality-claims") } },
  });
}

/** Admin issues an invoice for prepaid credits (bank transfer). Credits are added only when marked paid. */
export async function issueInvoice(args: { adminId: string; orgId: string; amountMinor: number; description: string; dueDays: number }) {
  if (args.amountMinor < 1000 || args.amountMinor > 1_000_000) throw new DomainError("INVALID", "Invoice amount must be between $10 and $10,000.");
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: args.orgId } });
  if (org.type !== "SELLER") throw new DomainError("INVALID", "Invoices are issued to seller organizations.");
  const inv = await prisma.invoice.create({
    data: { number: newInvoiceNumber(), orgId: org.id, status: "ISSUED", amountMinor: args.amountMinor, currency: "USD", description: args.description, dueAt: new Date(Date.now() + args.dueDays * 86_400_000), issuedAt: new Date(), createdById: args.adminId, isDemo: org.isDemo },
  });
  await audit(args.adminId, "invoice.issue", "Invoice", inv.id, { orgId: org.id, amountMinor: args.amountMinor });
  await notify({ userIds: await orgUserIds(org.id), type: "invoice_issued", title: `Invoice ${inv.number}`, body: `${formatMoney(inv.amountMinor)} for prepaid RFQ credits.`, link: "/seller/billing", dedupeKey: `invoice:${inv.id}` });
  return inv;
}

/** Seller requests a credit top-up invoice (finance reviews and issues it). */
export async function requestInvoice(args: { orgId: string; userId: string; amountMinor: number }) {
  if (args.amountMinor < 1000 || args.amountMinor > 1_000_000) throw new DomainError("INVALID", "Choose an amount between $10 and $10,000.");
  await audit(args.userId, "invoice.request", "Organization", args.orgId, { amountMinor: args.amountMinor });
  await alertAdmins("Credit invoice requested", `A seller requested an invoice for ${formatMoney(args.amountMinor)} of prepaid credits.`, `/admin/payments?invoiceFor=${args.orgId}&amount=${args.amountMinor}`, `invoice_request:${args.orgId}:${Date.now()}`, ["SUPER_ADMIN", "ADMIN", "FINANCE"]);
}

export async function markInvoicePaid(args: { adminId: string; invoiceId: string; reference: string }) {
  if (args.reference.trim().length < 3) throw new DomainError("INVALID", "Enter the bank/payment reference.");
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Invoice" WHERE "id" = ${args.invoiceId}::uuid FOR UPDATE`;
    const inv = await tx.invoice.findUniqueOrThrow({ where: { id: args.invoiceId } });
    if (inv.status !== "ISSUED") throw new DomainError("STATE", `Invoice is ${inv.status}.`);
    const payment = await tx.payment.create({
      data: { orgId: inv.orgId, purpose: "CREDIT_TOPUP", status: "PAID", provider: "manual", providerRef: `inv:${inv.number}`, amountMinor: inv.amountMinor, currency: inv.currency, idempotencyKey: `invoice:${inv.id}`, invoiceId: inv.id, paidAt: new Date(), initiatedById: args.adminId, isDemo: inv.isDemo },
    });
    await tx.paymentAttempt.create({ data: { paymentId: payment.id, toStatus: "PAID", source: "manual_invoice", detail: { reference: args.reference } } });
    await tx.invoice.update({ where: { id: inv.id }, data: { status: "PAID", paidAt: new Date(), paymentReference: args.reference.trim() } });
    await creditWallet(tx, { orgId: inv.orgId, amountMinor: inv.amountMinor, currency: inv.currency, type: "TOPUP", paymentId: payment.id, invoiceId: inv.id, memo: `Invoice ${inv.number} paid`, idempotencyKey: `invoice-credit:${inv.id}`, createdById: args.adminId });
    await audit(args.adminId, "invoice.mark_paid", "Invoice", inv.id, { reference: args.reference, amountMinor: inv.amountMinor }, tx);
  });
}

export async function voidInvoice(adminId: string, invoiceId: string) {
  const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (inv.status !== "ISSUED" && inv.status !== "DRAFT") throw new DomainError("STATE", `Invoice is ${inv.status}.`);
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "VOID" } });
  await audit(adminId, "invoice.void", "Invoice", invoiceId);
}

/** Manual wallet adjustment (e.g. goodwill). Positive only — debits happen through purchases. */
export async function adjustCredits(args: { adminId: string; orgId: string; amountMinor: number; memo: string }) {
  if (args.amountMinor <= 0 || args.amountMinor > 100_000) throw new DomainError("INVALID", "Adjustment must be between $0.01 and $1,000.");
  if (args.memo.trim().length < 5) throw new DomainError("INVALID", "Explain the adjustment.");
  await prisma.$transaction(async (tx) => {
    await creditWallet(tx, { orgId: args.orgId, amountMinor: args.amountMinor, currency: "USD", type: "ADJUSTMENT", memo: args.memo, idempotencyKey: `adjust:${args.orgId}:${Date.now()}`, createdById: args.adminId });
    await audit(args.adminId, "wallet.adjust", "Organization", args.orgId, { amountMinor: args.amountMinor, memo: args.memo }, tx);
  });
}

export function receiptUrl(unlockId: string) {
  return siteUrl(`/seller/transactions/${unlockId}/receipt`);
}
