import "server-only";
import { recordRfqEvent } from "@/lib/activity";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { audit } from "@/lib/audit";
import { notify, orgUserIds, alertAdmins } from "@/lib/notifications";
import { trackEvent } from "@/lib/analytics/events";
import { newReceiptNumber } from "@/lib/rfq/refs";
import { projectRfqForSeller } from "@/lib/rfq/disclosure";
import { assertTransition, canTransition, PAYMENT_TRANSITIONS } from "@/lib/state-machines";
import { paymentProvider, providerByName } from "@/lib/services/payments";
import type { ProviderPaymentStatus } from "@/lib/services/payments/types";
import { sellerAccess } from "@/lib/domain/access";
import { DomainError } from "@/lib/domain/rfq";
import type { PaymentStatus, Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export const RESERVATION_MINUTES = 15;

/** Locks the opportunity row for the rest of the transaction (serialises purchases of one RFQ). */
async function lockOpportunity(tx: Tx, rfqId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Opportunity" WHERE "rfqId" = ${rfqId}::uuid FOR UPDATE`;
  if (!rows.length) throw new DomainError("NOT_FOUND", "This opportunity is not available.");
  return tx.opportunity.findUniqueOrThrow({ where: { rfqId } });
}

async function lockPayment(tx: Tx, paymentId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id" = ${paymentId}::uuid FOR UPDATE`;
  return tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
}

async function expireStaleReservations(tx: Tx, rfqId: string) {
  await tx.rfqReservation.updateMany({ where: { rfqId, status: "ACTIVE", expiresAt: { lt: new Date() } }, data: { status: "EXPIRED", releasedReason: "Reservation expired" } });
}

function startOfUtcDay() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Spending controls configured by the seller. */
async function assertSpendingLimits(tx: Tx, sellerId: string, priceMinor: number) {
  const seller = await tx.sellerProfile.findUniqueOrThrow({ where: { id: sellerId } });
  const today = startOfUtcDay();
  const todays = await tx.rfqUnlock.findMany({ where: { sellerId, createdAt: { gte: today }, method: { not: "COMPLIMENTARY" } }, select: { priceMinor: true } });
  const pending = await tx.rfqReservation.findMany({ where: { sellerId, status: "ACTIVE", expiresAt: { gt: new Date() } }, select: { priceMinor: true } });
  if (todays.length + pending.length >= seller.dailyRfqLimit) throw new DomainError("LIMIT", `You've reached your daily limit of ${seller.dailyRfqLimit} RFQ unlocks. Change it in Settings.`);
  const spent = [...todays, ...pending].reduce((a, u) => a + u.priceMinor, 0);
  if (spent + priceMinor > seller.maxDailySpendMinor) throw new DomainError("LIMIT", `This purchase would exceed your daily spending cap of ${formatMoney(seller.maxDailySpendMinor)}.`);
}

/** Grants access atomically. Caller must hold the opportunity lock. */
async function grantUnlock(tx: Tx, args: { rfqId: string; sellerId: string; method: "CARD" | "CREDITS" | "INVOICE" | "COMPLIMENTARY"; priceMinor: number; currency: string; paymentId?: string | null; actorId?: string | null; reservationId?: string }) {
  const opp = await tx.opportunity.findUniqueOrThrow({ where: { rfqId: args.rfqId } });
  if (opp.unlockCount >= opp.maxUnlocks) throw new DomainError("SOLD_OUT", "This RFQ has already been purchased.");
  const rfq = await tx.rfq.findUniqueOrThrow({ where: { id: args.rfqId }, include: { spec: true } });
  const fields = {
    method: args.method, status: "ACTIVE" as const, priceMinor: args.priceMinor, currency: args.currency, paymentId: args.paymentId ?? null,
    receiptNumber: newReceiptNumber(), unlockedById: args.actorId ?? null, isDemo: rfq.isDemo,
  };
  const prior = await tx.rfqUnlock.findUnique({ where: { rfqId_sellerId: { rfqId: args.rfqId, sellerId: args.sellerId } } });
  if (prior?.status === "ACTIVE") throw new DomainError("ALREADY", "You already have access to this RFQ.");
  // A prior non-active row (refunded/revoked) is re-activated so the unique (rfq, seller) pair holds.
  const unlock = prior
    ? await tx.rfqUnlock.update({ where: { id: prior.id }, data: { ...fields, createdAt: new Date() } })
    : await tx.rfqUnlock.create({ data: { rfqId: args.rfqId, sellerId: args.sellerId, ...fields } });
  const newCount = opp.unlockCount + 1;
  // The CHECK constraint (unlockCount <= maxUnlocks) is the last line of defence against overselling.
  await tx.opportunity.update({ where: { id: opp.id }, data: { unlockCount: newCount, status: newCount >= opp.maxUnlocks ? "SOLD_OUT" : opp.status } });
  if (args.reservationId) await tx.rfqReservation.update({ where: { id: args.reservationId }, data: { status: "CONVERTED" } });
  // Release other sellers' holds once sold out.
  if (newCount >= opp.maxUnlocks) {
    await tx.rfqReservation.updateMany({ where: { rfqId: args.rfqId, status: "ACTIVE", id: args.reservationId ? { not: args.reservationId } : undefined }, data: { status: "RELEASED", releasedReason: "Sold out" } });
  }
  // Disclosure audit: exactly the fields the buyer's consent permits.
  const view = projectRfqForSeller(rfq, { unlocked: true });
  await tx.dataDisclosureEvent.create({ data: { rfqId: args.rfqId, sellerId: args.sellerId, unlockId: unlock.id, actorId: args.actorId ?? null, fields: view.disclosedFields, reason: `UNLOCK_${args.method}` } });
  await tx.conversation.upsert({ where: { rfqId_sellerId: { rfqId: args.rfqId, sellerId: args.sellerId } }, create: { rfqId: args.rfqId, sellerId: args.sellerId }, update: {} });
  return unlock;
}

async function afterUnlock(unlockId: string) {
  const unlock = await prisma.rfqUnlock.findUniqueOrThrow({ where: { id: unlockId }, include: { rfq: true, seller: true } });
  const methodLabel = { CARD: "Card", CREDITS: "Prepaid credits", INVOICE: "Invoice", COMPLIMENTARY: "Complimentary" }[unlock.method];
  await notify({
    userIds: await orgUserIds(unlock.seller.orgId),
    type: "rfq_unlocked",
    title: `RFQ ${unlock.rfq.publicRef} unlocked`,
    body: `Receipt ${unlock.receiptNumber} — ${formatMoney(unlock.priceMinor, unlock.currency)} (${methodLabel}).`,
    link: `/seller/opportunities/${unlock.rfqId}`,
    dedupeKey: `unlock:${unlock.id}`,
    email: {
      template: "unlock_receipt",
      data: { receipt: unlock.receiptNumber, ref: unlock.rfq.publicRef, amount: formatMoney(unlock.priceMinor, unlock.currency), method: methodLabel, date: formatDate(unlock.createdAt), url: siteUrl(`/seller/opportunities/${unlock.rfqId}`) },
    },
  });
  await trackEvent("RFQUnlocked", { rfqId: unlock.rfqId, orgId: unlock.seller.orgId, props: { method: unlock.method, priceMinor: unlock.priceMinor }, isDemo: unlock.isDemo });
  await recordRfqEvent("RFQ_UNLOCKED", unlock.rfqId, unlock.sellerId);
}

export type StartUnlockResult =
  | { kind: "unlocked"; unlockId: string }
  | { kind: "redirect"; url: string; paymentId: string };

/**
 * Seller starts a purchase. Steps: eligibility → availability → short-lived reservation →
 * (credits: atomic debit + grant) | (card: payment + hosted checkout; access only after a verified webhook).
 */
export async function startUnlock(args: { sellerId: string; orgId: string; userId: string; userEmail: string; rfqId: string; method: "CARD" | "CREDITS" }): Promise<StartUnlockResult> {
  const { sellerId, orgId, rfqId } = args;
  const provider = paymentProvider();
  if (args.method === "CARD" && !(provider.configured && provider.capabilities.hostedCheckout)) {
    throw new DomainError("PAYMENTS_UNAVAILABLE", "Card payments are not enabled yet. Use prepaid credits (request an invoice in Billing).");
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const opp = await lockOpportunity(tx, rfqId);
      const access = await sellerAccess(sellerId, rfqId, tx);
      if (!access.verified) throw new DomainError("NOT_VERIFIED", "Only verified manufacturers can purchase RFQ access.");
      if (access.unlocked) throw new DomainError("ALREADY", "You already have access to this RFQ.");
      if (!access.canView) throw new DomainError("NOT_ELIGIBLE", "This opportunity isn't available to your account.");
      if (opp.status !== "AVAILABLE" || (opp.expiresAt && opp.expiresAt < new Date())) throw new DomainError("UNAVAILABLE", "This opportunity is no longer available.");
      const seller = await tx.sellerProfile.findUniqueOrThrow({ where: { id: sellerId } });
      if (seller.availability !== "ACTIVE") throw new DomainError("PAUSED", "Your account is paused. Resume it in Settings to purchase.");

      await expireStaleReservations(tx, rfqId);
      const active = await tx.rfqReservation.findMany({ where: { rfqId, status: "ACTIVE" } });
      const mine = active.find((r) => r.sellerId === sellerId);
      if (mine?.paymentId && args.method === "CARD") {
        const p = await tx.payment.findUniqueOrThrow({ where: { id: mine.paymentId } });
        if (p.checkoutUrl && ["CREATED", "PENDING", "REQUIRES_AUTHENTICATION"].includes(p.status)) return { kind: "existing" as const, paymentId: p.id, url: p.checkoutUrl };
      }
      if (mine) await tx.rfqReservation.update({ where: { id: mine.id }, data: { status: "RELEASED", releasedReason: "Replaced by new attempt" } });
      const others = active.filter((r) => r.sellerId !== sellerId).length;
      if (opp.unlockCount + others >= opp.maxUnlocks) {
        throw new DomainError(opp.unlockCount >= opp.maxUnlocks ? "SOLD_OUT" : "RESERVED", opp.unlockCount >= opp.maxUnlocks ? "This RFQ has already been purchased." : "Another manufacturer is completing a purchase. Try again in a few minutes.");
      }
      await assertSpendingLimits(tx, sellerId, opp.priceMinor);

      const reservation = await tx.rfqReservation.create({
        data: { rfqId, sellerId, priceMinor: opp.priceMinor, currency: opp.currency, expiresAt: new Date(Date.now() + RESERVATION_MINUTES * 60_000) },
      });

      if (args.method === "CREDITS") {
        const wallet = await tx.wallet.findUnique({ where: { orgId } });
        if (!wallet || wallet.currency !== opp.currency) throw new DomainError("NO_CREDITS", "You have no prepaid credits. Request an invoice in Billing to add credits.");
        // Conditional decrement: succeeds only if the balance covers the price (no negative balances, no races).
        const debited = await tx.wallet.updateMany({ where: { id: wallet.id, balanceMinor: { gte: opp.priceMinor } }, data: { balanceMinor: { decrement: opp.priceMinor } } });
        if (debited.count !== 1) throw new DomainError("INSUFFICIENT_CREDITS", `Insufficient credits. This RFQ costs ${formatMoney(opp.priceMinor, opp.currency)}.`);
        const after = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
        const unlock = await grantUnlock(tx, { rfqId, sellerId, method: "CREDITS", priceMinor: opp.priceMinor, currency: opp.currency, actorId: args.userId, reservationId: reservation.id });
        await tx.walletLedgerEntry.create({
          data: { walletId: wallet.id, type: "UNLOCK_DEBIT", amountMinor: -opp.priceMinor, balanceAfter: after.balanceMinor, currency: opp.currency, unlockId: unlock.id, memo: `RFQ unlock ${unlock.receiptNumber}`, createdById: args.userId, idempotencyKey: `unlock-debit:${unlock.id}` },
        });
        await audit(args.userId, "rfq.unlock", "RfqUnlock", unlock.id, { rfqId, method: "CREDITS", priceMinor: opp.priceMinor }, tx);
        return { kind: "unlocked" as const, unlockId: unlock.id };
      }

      const payment = await tx.payment.create({
        data: {
          orgId, purpose: "RFQ_UNLOCK", status: "CREATED", provider: provider.name, amountMinor: opp.priceMinor, currency: opp.currency,
          idempotencyKey: `unlock:${reservation.id}`, rfqId, initiatedById: args.userId, isDemo: opp.isDemo,
        },
      });
      await tx.rfqReservation.update({ where: { id: reservation.id }, data: { paymentId: payment.id } });
      await tx.paymentAttempt.create({ data: { paymentId: payment.id, toStatus: "CREATED", source: "platform" } });
      return { kind: "card" as const, paymentId: payment.id, reservationId: reservation.id, priceMinor: opp.priceMinor, currency: opp.currency };
    },
    { timeout: 15_000 },
  );

  await trackEvent("RFQUnlockStarted", { rfqId, orgId, userId: args.userId, props: { method: args.method } });
  if (result.kind === "unlocked") {
    await afterUnlock(result.unlockId);
    return result;
  }
  if (result.kind === "existing") return { kind: "redirect", url: result.url, paymentId: result.paymentId };

  // Hosted checkout is created outside the DB transaction (network call), then recorded.
  const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: rfqId }, select: { publicRef: true } });
  try {
    const session = await provider.createCheckout({
      paymentId: result.paymentId, amountMinor: result.priceMinor, currency: result.currency, description: `RFQ access ${rfq.publicRef}`, customerEmail: args.userEmail,
      returnUrl: siteUrl(`/seller/billing/return?payment=${result.paymentId}`), cancelUrl: siteUrl(`/seller/opportunities/${rfqId}?payment=cancelled`), idempotencyKey: `checkout:${result.paymentId}`,
    });
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: result.paymentId }, data: { providerRef: session.providerRef, checkoutUrl: session.checkoutUrl, status: "PENDING" } });
      await tx.paymentAttempt.create({ data: { paymentId: result.paymentId, fromStatus: "CREATED", toStatus: "PENDING", source: "platform", providerRef: session.providerRef } });
    });
    return { kind: "redirect", url: session.checkoutUrl, paymentId: result.paymentId };
  } catch (e) {
    await failPayment(result.paymentId, e instanceof Error ? e.message : "Checkout could not be created", "platform");
    throw new DomainError("PAYMENT_ERROR", "We couldn't start the payment. You have not been charged. Please try again.");
  }
}

async function failPayment(paymentId: string, reason: string, source: string, to: PaymentStatus = "FAILED") {
  await prisma.$transaction(async (tx) => {
    const p = await lockPayment(tx, paymentId);
    if (!canTransition(PAYMENT_TRANSITIONS, p.status, to)) return;
    await tx.payment.update({ where: { id: p.id }, data: { status: to, failureReason: reason.slice(0, 500) } });
    await tx.paymentAttempt.create({ data: { paymentId: p.id, fromStatus: p.status, toStatus: to, source, detail: { reason } } });
    await tx.rfqReservation.updateMany({ where: { paymentId: p.id, status: "ACTIVE" }, data: { status: "RELEASED", releasedReason: `Payment ${to.toLowerCase()}` } });
  });
}

/**
 * Applies a VERIFIED provider event (webhook or server-side reconciliation). Idempotent.
 * Access is granted only when: status is PAID, amount and currency match the payment exactly,
 * and the opportunity still has capacity. A paid-but-unfulfillable payment is credited back.
 */
export async function applyProviderPaymentStatus(provider: string, providerRef: string, status: ProviderPaymentStatus, amountMinor: number, currency: string, source: string) {
  const payment = await prisma.payment.findUnique({ where: { provider_providerRef: { provider, providerRef } } });
  if (!payment) return { ok: false as const, reason: "Unknown payment" };
  if (status === "FAILED" || status === "CANCELLED") {
    await failPayment(payment.id, `Provider reported ${status.toLowerCase()}`, source, status);
    await notify({ userIds: await orgUserIds(payment.orgId), type: "payment_failed", title: "Payment not completed", body: "Your payment did not go through. The RFQ remains locked and you were not charged.", link: payment.rfqId ? `/seller/opportunities/${payment.rfqId}` : "/seller/billing", dedupeKey: `payment_failed:${payment.id}` });
    await alertAdmins("Failed payment", `Payment ${payment.id.slice(0, 8)} ${status.toLowerCase()} (${formatMoney(payment.amountMinor, payment.currency)}).`, `/admin/payments?id=${payment.id}`, `payment_failed:${payment.id}`, ["SUPER_ADMIN", "ADMIN", "FINANCE"]);
    return { ok: true as const, status };
  }
  if (status !== "PAID") {
    await prisma.$transaction(async (tx) => {
      const p = await lockPayment(tx, payment.id);
      const to = status as PaymentStatus;
      if (p.status === to || !canTransition(PAYMENT_TRANSITIONS, p.status, to)) return;
      await tx.payment.update({ where: { id: p.id }, data: { status: to } });
      await tx.paymentAttempt.create({ data: { paymentId: p.id, fromStatus: p.status, toStatus: to, source } });
    });
    return { ok: true as const, status };
  }

  let unlockId: string | null = null;
  let creditedBack = false;
  await prisma.$transaction(
    async (tx) => {
      const p = await lockPayment(tx, payment.id);
      if (p.status === "PAID" || p.status === "REFUNDED") return; // idempotent replay
      if (amountMinor !== p.amountMinor || currency.toUpperCase() !== p.currency) {
        await tx.payment.update({ where: { id: p.id }, data: { status: "DISPUTED", failureReason: `Amount mismatch: provider ${amountMinor} ${currency}, expected ${p.amountMinor} ${p.currency}` } });
        await tx.paymentAttempt.create({ data: { paymentId: p.id, fromStatus: p.status, toStatus: "DISPUTED", source, detail: { amountMinor, currency } } });
        return;
      }
      assertTransition("payment", PAYMENT_TRANSITIONS, p.status, "PAID");
      await tx.payment.update({ where: { id: p.id }, data: { status: "PAID", paidAt: new Date(), failureReason: null } });
      await tx.paymentAttempt.create({ data: { paymentId: p.id, fromStatus: p.status, toStatus: "PAID", source } });

      if (p.purpose === "CREDIT_TOPUP") {
        await creditWallet(tx, { orgId: p.orgId, amountMinor: p.amountMinor, currency: p.currency, type: "TOPUP", paymentId: p.id, memo: "Credit top-up", idempotencyKey: `topup:${p.id}` });
        return;
      }
      if (!p.rfqId) return;
      await lockOpportunity(tx, p.rfqId);
      const reservation = await tx.rfqReservation.findUnique({ where: { paymentId: p.id } });
      const opp = await tx.opportunity.findUniqueOrThrow({ where: { rfqId: p.rfqId } });
      const seller = await tx.sellerProfile.findUniqueOrThrow({ where: { orgId: p.orgId } });
      const existing = await tx.rfqUnlock.findUnique({ where: { rfqId_sellerId: { rfqId: p.rfqId, sellerId: seller.id } } });
      const othersHolding = await tx.rfqReservation.count({ where: { rfqId: p.rfqId, status: "ACTIVE", expiresAt: { gt: new Date() }, id: reservation ? { not: reservation.id } : undefined } });
      const reservationValid = reservation?.status === "ACTIVE";
      const capacity = opp.maxUnlocks - opp.unlockCount - (reservationValid ? 0 : othersHolding);
      const stillEligible = (await sellerAccess(seller.id, p.rfqId, tx)).canView;
      if (!existing && capacity > 0 && opp.status !== "WITHDRAWN" && stillEligible) {
        const unlock = await grantUnlock(tx, { rfqId: p.rfqId, sellerId: seller.id, method: "CARD", priceMinor: p.amountMinor, currency: p.currency, paymentId: p.id, actorId: p.initiatedById, reservationId: reservation?.id });
        unlockId = unlock.id;
        await audit(p.initiatedById, "rfq.unlock", "RfqUnlock", unlock.id, { rfqId: p.rfqId, method: "CARD", paymentId: p.id }, tx);
      } else {
        // Paid, but the RFQ can no longer be granted (sold out / withdrawn / already unlocked): never leave the seller out of pocket.
        if (reservation?.status === "ACTIVE") await tx.rfqReservation.update({ where: { id: reservation.id }, data: { status: "RELEASED", releasedReason: "Unavailable at payment confirmation" } });
        const refund = await tx.refund.create({
          data: { unlockId: existing?.id ?? (await placeholderUnlockFor(tx, p.rfqId, seller.id, p)), paymentId: p.id, method: "CREDIT", status: "PROCESSED", amountMinor: p.amountMinor, currency: p.currency, reason: "RFQ no longer available when payment was confirmed", processedAt: new Date() },
        });
        await creditWallet(tx, { orgId: p.orgId, amountMinor: p.amountMinor, currency: p.currency, type: "REFUND_CREDIT", paymentId: p.id, refundId: refund.id, memo: "Automatic credit: RFQ unavailable at payment confirmation", idempotencyKey: `auto-credit:${p.id}` });
        creditedBack = true;
      }
    },
    { timeout: 15_000 },
  );
  if (unlockId) await afterUnlock(unlockId);
  if (creditedBack) {
    await notify({ userIds: await orgUserIds(payment.orgId), type: "payment_credited", title: "RFQ no longer available — credited", body: `Your payment of ${formatMoney(payment.amountMinor, payment.currency)} was added to your prepaid credits.`, link: "/seller/billing", dedupeKey: `payment_credited:${payment.id}` });
    await alertAdmins("Paid but unavailable", `Payment ${payment.id.slice(0, 8)} was credited back to the seller.`, `/admin/payments?id=${payment.id}`, `paid_unavailable:${payment.id}`, ["SUPER_ADMIN", "ADMIN", "FINANCE"]);
  }
  return { ok: true as const, status, unlockId, creditedBack };
}

/**
 * Refund rows reference an unlock. When a paid card purchase could not be fulfilled there is no
 * real unlock, so we record a REVOKED zero-access unlock for the ledger trail (it grants nothing).
 */
async function placeholderUnlockFor(tx: Tx, rfqId: string, sellerId: string, p: { id: string; amountMinor: number; currency: string; isDemo: boolean }) {
  const u = await tx.rfqUnlock.create({
    data: { rfqId, sellerId, method: "CARD", status: "REVOKED", priceMinor: p.amountMinor, currency: p.currency, paymentId: p.id, receiptNumber: newReceiptNumber(), isDemo: p.isDemo },
  });
  return u.id;
}

export async function creditWallet(
  tx: Tx,
  a: { orgId: string; amountMinor: number; currency: string; type: "TOPUP" | "REFUND_CREDIT" | "ADJUSTMENT"; paymentId?: string; refundId?: string; invoiceId?: string; unlockId?: string; memo: string; idempotencyKey: string; createdById?: string | null },
) {
  const dup = await tx.walletLedgerEntry.findUnique({ where: { idempotencyKey: a.idempotencyKey } });
  if (dup) return dup;
  const wallet = await tx.wallet.upsert({ where: { orgId: a.orgId }, create: { orgId: a.orgId, currency: a.currency }, update: {} });
  if (wallet.currency !== a.currency) throw new DomainError("CURRENCY", `Wallet currency is ${wallet.currency}`);
  const updated = await tx.wallet.update({ where: { id: wallet.id }, data: { balanceMinor: { increment: a.amountMinor } } });
  return tx.walletLedgerEntry.create({
    data: {
      walletId: wallet.id, type: a.type, amountMinor: a.amountMinor, balanceAfter: updated.balanceMinor, currency: a.currency, paymentId: a.paymentId, refundId: a.refundId,
      invoiceId: a.invoiceId, unlockId: a.unlockId, memo: a.memo, idempotencyKey: a.idempotencyKey, createdById: a.createdById ?? null,
    },
  });
}

/** Return-URL reconciliation: asks the provider for the authoritative status (never trusts query params). */
export async function reconcilePayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || !payment.providerRef) return payment;
  if (["PAID", "FAILED", "CANCELLED", "REFUNDED"].includes(payment.status)) return payment;
  const provider = providerByName(payment.provider);
  if (!provider?.configured) return payment;
  try {
    const remote = await provider.retrieve(payment.providerRef);
    if (remote) await applyProviderPaymentStatus(payment.provider, payment.providerRef, remote.status, remote.amountMinor, remote.currency, "reconcile");
  } catch (e) {
    console.error("[payments] reconcile failed", e);
  }
  return prisma.payment.findUnique({ where: { id: paymentId } });
}

/** Job: expire reservations and abandon stale unpaid checkouts. */
export async function expireReservations() {
  const now = new Date();
  const expired = await prisma.rfqReservation.updateMany({ where: { status: "ACTIVE", expiresAt: { lt: now } }, data: { status: "EXPIRED", releasedReason: "Reservation expired" } });
  const stale = await prisma.payment.findMany({ where: { status: { in: ["CREATED", "PENDING", "REQUIRES_AUTHENTICATION"] }, createdAt: { lt: new Date(now.getTime() - 24 * 3_600_000) } } });
  for (const p of stale) {
    if (p.providerRef) await reconcilePayment(p.id);
    const fresh = await prisma.payment.findUniqueOrThrow({ where: { id: p.id } });
    if (["CREATED", "PENDING", "REQUIRES_AUTHENTICATION"].includes(fresh.status)) await failPayment(p.id, "Checkout abandoned (24h)", "expiry", "CANCELLED");
  }
  await prisma.opportunity.updateMany({ where: { status: "AVAILABLE", expiresAt: { lt: now } }, data: { status: "EXPIRED" } });
  return { expiredReservations: expired.count, abandonedPayments: stale.length };
}
