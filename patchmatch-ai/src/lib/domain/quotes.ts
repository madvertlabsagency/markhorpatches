import "server-only";
import { recordRfqEvent } from "@/lib/activity";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { toMinor } from "@/lib/money";
import { audit } from "@/lib/audit";
import { notify, orgUserIds, queueEmail } from "@/lib/notifications";
import { trackEvent } from "@/lib/analytics/events";
import { assertTransition, QUOTE_TRANSITIONS } from "@/lib/state-machines";
import { sellerAccess } from "@/lib/domain/access";
import { DomainError, setRfqStatus } from "@/lib/domain/rfq";
import { computeQuoteTotals } from "@/lib/quote-math";
export { computeQuoteTotals };
import type { Prisma } from "@/generated/prisma/client";

const money = z.preprocess((v) => (v === "" || v === undefined || v === null ? 0 : Number(v)), z.number().min(0).max(1_000_000));

export const quoteInputSchema = z.object({
  quantity: z.preprocess((v) => Number(v), z.number().int().min(1).max(1_000_000)),
  unitPrice: z.preprocess((v) => Number(v), z.number().positive("Enter a unit price").max(100_000)),
  setupFee: money,
  sampleFee: money,
  toolingFee: money,
  artworkFee: money,
  shipping: money,
  currency: z.enum(["USD"]).default("USD"),
  productionDays: z.preprocess((v) => Number(v), z.number().int().min(1, "Enter production days").max(365)),
  deliveryEstimate: z.string().trim().max(120).optional(),
  moq: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(1).optional()),
  samplePolicy: z.string().trim().max(500).optional(),
  paymentTerms: z.string().trim().max(500).optional(),
  revisionPolicy: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(3000).optional(),
  validDays: z.preprocess((v) => (v === "" || v == null ? 30 : Number(v)), z.number().int().min(1).max(180)),
});
export type QuoteInput = z.infer<typeof quoteInputSchema>;

function snapshot(q: Prisma.QuoteGetPayload<object>) {
  const { id: _id, rfqId: _r, sellerId: _s, ...rest } = q;
  return JSON.parse(JSON.stringify(rest));
}

/** Seller saves (draft) or submits a quote. Requires an ACTIVE unlock — no quoting blind. */
export async function saveQuote(args: { sellerId: string; userId: string; rfqId: string; input: QuoteInput; submit: boolean; revisionNote?: string }) {
  const access = await sellerAccess(args.sellerId, args.rfqId);
  if (!access.unlocked) throw new DomainError("LOCKED", "Unlock this RFQ before sending a quotation.");
  const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: args.rfqId } });
  if (["CLOSED", "CANCELLED", "EXPIRED", "SELLER_SELECTED"].includes(rfq.status)) throw new DomainError("CLOSED", "This RFQ is no longer accepting quotations.");
  const t = computeQuoteTotals(args.input);
  const i = args.input;
  const data = {
    quantity: i.quantity, unitPriceMinor: t.unitMinor, setupFeeMinor: toMinor(i.setupFee), sampleFeeMinor: toMinor(i.sampleFee), toolingFeeMinor: toMinor(i.toolingFee),
    artworkFeeMinor: toMinor(i.artworkFee), shippingMinor: toMinor(i.shipping), totalMinor: t.totalMinor, currency: i.currency, productionDays: i.productionDays,
    deliveryEstimate: i.deliveryEstimate, moq: i.moq, samplePolicy: i.samplePolicy, paymentTerms: i.paymentTerms, revisionPolicy: i.revisionPolicy, notes: i.notes,
    validUntil: new Date(Date.now() + i.validDays * 86_400_000), isDemo: rfq.isDemo,
  };

  const quote = await prisma.$transaction(async (tx) => {
    const existing = await tx.quote.findUnique({ where: { rfqId_sellerId: { rfqId: args.rfqId, sellerId: args.sellerId } } });
    let q;
    if (!existing) {
      q = await tx.quote.create({ data: { rfqId: args.rfqId, sellerId: args.sellerId, ...data, status: args.submit ? "SUBMITTED" : "DRAFT", submittedAt: args.submit ? new Date() : null } });
    } else {
      if (["ACCEPTED", "REJECTED", "WITHDRAWN", "EXPIRED"].includes(existing.status)) throw new DomainError("LOCKED", `This quote is ${existing.status.toLowerCase()} and can't be changed.`);
      const wasSubmitted = existing.status !== "DRAFT";
      const to = !args.submit ? existing.status : wasSubmitted ? "REVISED" : "SUBMITTED";
      if (to !== existing.status) assertTransition("quote", QUOTE_TRANSITIONS, existing.status, to);
      if (wasSubmitted && !args.submit) throw new DomainError("INVALID", "A submitted quote can only be revised and resubmitted.");
      if (wasSubmitted) await tx.quoteRevision.create({ data: { quoteId: existing.id, version: existing.version, snapshot: snapshot(existing), note: args.revisionNote } });
      q = await tx.quote.update({
        where: { id: existing.id },
        data: { ...data, status: to, version: wasSubmitted ? existing.version + 1 : existing.version, submittedAt: args.submit ? new Date() : existing.submittedAt, viewedAt: wasSubmitted ? null : existing.viewedAt },
      });
    }
    await tx.quoteLineItem.deleteMany({ where: { quoteId: q.id } });
    await tx.quoteLineItem.createMany({ data: t.lines.map((l, idx) => ({ quoteId: q.id, ...l, sortOrder: idx })) });
    if (args.submit) {
      if (rfq.status === "SELLER_NOTIFIED") await setRfqStatus(tx, rfq.id, "QUOTES_RECEIVED", { actorId: args.userId, note: "First quotation received" });
      await tx.sellerProfile.update({ where: { id: args.sellerId }, data: { quotesSubmitted: { increment: existing && existing.status !== "DRAFT" ? 0 : 1 } } });
      await audit(args.userId, existing && existing.status !== "DRAFT" ? "quote.revise" : "quote.submit", "Quote", q.id, { rfqId: rfq.id, totalMinor: t.totalMinor }, tx);
    }
    return q;
  });

  if (args.submit) {
    const seller = await prisma.sellerProfile.findUniqueOrThrow({ where: { id: args.sellerId } });
    const sellerName = seller.tradingName ?? seller.legalName;
    const data = { name: rfq.contactName.split(" ")[0], ref: rfq.publicRef, seller: sellerName, url: siteUrl(`/buyer/rfqs/${rfq.id}#quotes`) };
    if (rfq.buyerUserId) {
      await notify({ userIds: [rfq.buyerUserId], type: "quote_received", title: `New quote from ${sellerName}`, body: `For ${rfq.publicRef}.`, link: `/buyer/rfqs/${rfq.id}#quotes`, dedupeKey: `quote:${quote.id}:v${quote.version}`, email: { template: "quote_received", data } });
    } else {
      await queueEmail(rfq.contactEmail, "quote_received", { ...data, url: siteUrl(`/rfq/track/${rfq.publicRef}`) }, `quote:${quote.id}:v${quote.version}:guest`);
    }
    await trackEvent("QuoteSubmitted", { rfqId: rfq.id, orgId: seller.orgId, props: { totalMinor: quote.totalMinor, version: quote.version }, isDemo: rfq.isDemo });
    if (quote.version === 1) await recordRfqEvent("QUOTE_SENT", rfq.id, seller.id, { valueMinor: quote.totalMinor });
    await refreshSellerResponseTime(args.sellerId);
  }
  return quote;
}

export async function withdrawQuote(sellerId: string, userId: string, quoteId: string) {
  const q = await prisma.quote.findUniqueOrThrow({ where: { id: quoteId } });
  if (q.sellerId !== sellerId) throw new DomainError("FORBIDDEN", "Not your quote.");
  assertTransition("quote", QUOTE_TRANSITIONS, q.status, "WITHDRAWN");
  await prisma.quote.update({ where: { id: quoteId }, data: { status: "WITHDRAWN", decidedAt: new Date() } });
  await audit(userId, "quote.withdraw", "Quote", quoteId);
}

/** Buyer-side quote actions (caller must have verified RFQ ownership). */
export async function buyerQuoteAction(args: { rfqId: string; quoteId: string; userId: string; action: "VIEW" | "SHORTLIST" | "UNSHORTLIST" | "REJECT" | "CLARIFY" | "SELECT"; message?: string }) {
  const q = await prisma.quote.findUniqueOrThrow({ where: { id: args.quoteId }, include: { seller: true, rfq: true } });
  if (q.rfqId !== args.rfqId || q.status === "DRAFT") throw new DomainError("NOT_FOUND", "Quote not found.");
  switch (args.action) {
    case "VIEW":
      if (q.status === "SUBMITTED" || q.status === "REVISED") await prisma.quote.update({ where: { id: q.id }, data: { status: "VIEWED", viewedAt: new Date() } });
      return;
    case "SHORTLIST":
    case "UNSHORTLIST":
      await prisma.quote.update({ where: { id: q.id }, data: { shortlisted: args.action === "SHORTLIST" } });
      return;
    case "REJECT":
      assertTransition("quote", QUOTE_TRANSITIONS, q.status, "REJECTED");
      await prisma.quote.update({ where: { id: q.id }, data: { status: "REJECTED", decidedAt: new Date() } });
      return;
    case "CLARIFY": {
      assertTransition("quote", QUOTE_TRANSITIONS, q.status, "CLARIFICATION_REQUESTED");
      await prisma.quote.update({ where: { id: q.id }, data: { status: "CLARIFICATION_REQUESTED" } });
      const { postMessage } = await import("@/lib/domain/messages");
      await postMessage({ rfqId: q.rfqId, sellerId: q.sellerId, side: "BUYER", userId: args.userId, body: `Clarification requested on your quote: ${args.message ?? ""}`.trim() });
      return;
    }
    case "SELECT": {
      if (["REJECTED", "WITHDRAWN", "EXPIRED"].includes(q.status)) throw new DomainError("INVALID", "This quote can't be selected.");
      await prisma.$transaction(async (tx) => {
        await tx.quote.update({ where: { id: q.id }, data: { status: "ACCEPTED", decidedAt: new Date() } });
        await tx.rfq.update({ where: { id: q.rfqId }, data: { selectedQuoteId: q.id } });
        await setRfqStatus(tx, q.rfqId, "SELLER_SELECTED", { actorId: args.userId, note: `Selected ${q.seller.tradingName ?? q.seller.legalName}` });
        await audit(args.userId, "quote.select", "Quote", q.id, { rfqId: q.rfqId }, tx);
      });
      await notify({
        userIds: await orgUserIds(q.seller.orgId), type: "seller_selected", title: `Selected for ${q.rfq.publicRef}`, body: "The buyer selected your quotation.", link: `/seller/opportunities/${q.rfqId}`,
        dedupeKey: `selected:${q.id}`, email: { template: "seller_selected", data: { seller: q.seller.tradingName ?? q.seller.legalName, ref: q.rfq.publicRef, url: siteUrl(`/seller/messages?rfq=${q.rfqId}`) } },
      });
      await trackEvent("BuyerSelectedSeller", { rfqId: q.rfqId, userId: args.userId, isDemo: q.isDemo });
      await recordRfqEvent("SELLER_SELECTED", q.rfqId, q.sellerId);
      return;
    }
  }
}

/** Average minutes from unlock to first submitted quote — real platform data only. */
export async function refreshSellerResponseTime(sellerId: string) {
  const unlocks = await prisma.rfqUnlock.findMany({ where: { sellerId, status: "ACTIVE" }, select: { rfqId: true, createdAt: true }, take: 200, orderBy: { createdAt: "desc" } });
  const quotes = await prisma.quote.findMany({ where: { sellerId, submittedAt: { not: null } }, select: { rfqId: true, submittedAt: true } });
  const qMap = new Map(quotes.map((q) => [q.rfqId, q.submittedAt!]));
  const diffs = unlocks.map((u) => (qMap.has(u.rfqId) ? (qMap.get(u.rfqId)!.getTime() - u.createdAt.getTime()) / 60_000 : null)).filter((d): d is number => d !== null && d >= 0);
  if (diffs.length >= 3) await prisma.sellerProfile.update({ where: { id: sellerId }, data: { avgResponseMinutes: Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length) } });
}
