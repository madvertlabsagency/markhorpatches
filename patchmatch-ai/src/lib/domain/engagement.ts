import "server-only";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notify, orgUserIds } from "@/lib/notifications";
import { enqueue } from "@/lib/jobs/queue";
import { marketplaceSettings } from "@/lib/settings";
import { pricingTierFor, TIER_LABEL } from "@/lib/rfq/tiers";
import { priceOpportunity } from "@/lib/pricing/engine";
import { trackEvent } from "@/lib/analytics/events";
import { DomainError, notifyBuyer, setRfqStatus } from "@/lib/domain/rfq";
import { loadPricingRules } from "@/lib/domain/matching";
import { sha256 } from "@/lib/crypto";
import type { BuyerIntent } from "@/generated/prisma/client";

/**
 * Buyer engagement: intent (re)confirmation, quality-tier pricing, reminders and closure.
 * Contact verification, buyer intent and RFQ quality are separate dimensions on the RFQ.
 */

const CLOSED = ["CLOSED", "CANCELLED", "EXPIRED", "SELLER_SELECTED"];

/** Recomputes the unlock tier from current facts; reprices a listing only while nobody has bought it. */
export async function refreshPricingTier(rfqId: string) {
  const rfq = await prisma.rfq.findUnique({ where: { id: rfqId }, include: { spec: true, qualifications: { where: { isCurrent: true } }, consents: true, opportunity: true, _count: { select: { artwork: true } } } });
  const q = rfq?.qualifications[0];
  if (!rfq?.spec || !q) return null;
  const settings = await marketplaceSettings();
  const { tier } = pricingTierFor({
    qualityTier: q.tier, emailVerified: !!rfq.emailVerifiedAt, consented: rfq.consents.some((c) => c.kind === "DATA_SHARING" && c.granted),
    intentStatus: rfq.intentStatus, intentConfirmedAt: rfq.intentConfirmedAt, artworkCount: rfq._count.artwork, quantity: rfq.spec.quantity, requiredBy: rfq.spec.requiredBy,
    buyingStage: rfq.buyingStage, completenessScore: q.completenessScore, contactReadyMaxAgeDays: settings.contactReadyMaxAgeDays,
  });
  if (!tier || tier === q.pricingTier || (q.source === "ADMIN" && q.pricingTier === "ENTERPRISE")) return q.pricingTier;
  await prisma.rfqQualification.update({ where: { id: q.id }, data: { pricingTier: tier } });
  const opp = rfq.opportunity;
  if (opp && opp.status === "AVAILABLE" && opp.unlockCount === 0 && !opp.priceOverridden && tier !== "ENTERPRISE") {
    const quote = priceOpportunity(await loadPricingRules(), tier, rfq.patchType, opp.distributionMode);
    if (quote && quote.priceMinor !== opp.priceMinor) {
      await prisma.$transaction(async (tx) => {
        await tx.opportunity.update({ where: { id: opp.id }, data: { priceMinor: quote.priceMinor, pricingTier: tier, pricingRuleId: quote.ruleId } });
        await tx.opportunityPriceEvent.create({ data: { opportunityId: opp.id, priceMinor: quote.priceMinor, currency: "USD", pricingRuleId: quote.ruleId, reason: `Tier changed to ${TIER_LABEL[tier]}` } });
      });
    }
  }
  return tier;
}

export type IntentChoice = "READY" | "LATER" | "FOUND_SUPPLIER";

/** Buyer answers "Are you still looking to receive quotations?". Recorded with a timestamp. */
export async function confirmIntent(rfqId: string, choice: IntentChoice, actor: { userId?: string | null; via: "dashboard" | "email_link" | "tracking" | "demo" }) {
  const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: rfqId }, include: { opportunity: true } });
  if (["CLOSED", "CANCELLED", "EXPIRED"].includes(rfq.status)) throw new DomainError("CLOSED", "This request is already closed.");
  const status: BuyerIntent = choice === "READY" ? "READY_FOR_QUOTES" : choice === "LATER" ? "RESEARCHING" : "NO_LONGER_INTERESTED";
  await prisma.$transaction(async (tx) => {
    await tx.rfq.update({ where: { id: rfqId }, data: { intentStatus: status, intentConfirmedAt: new Date() } });
    await tx.consentRecord.create({ data: { kind: "SUPPLIER_MATCHING", granted: status !== "NO_LONGER_INTERESTED", email: rfq.contactEmail, userId: actor.userId ?? null, rfqId, textVersion: `intent:${status}`, textHash: sha256(`intent:${status}:${actor.via}`) } });
    await audit(actor.userId ?? null, "rfq.intent", "Rfq", rfqId, { status, via: actor.via }, tx);
  });
  await trackEvent("BuyerIntentConfirmed", { rfqId, props: { status }, isDemo: rfq.isDemo });
  if (status === "NO_LONGER_INTERESTED") {
    await closeRfq(rfqId, actor.userId ?? null, "Buyer already found a supplier");
    return status;
  }
  await refreshPricingTier(rfqId);
  return status;
}

/** Closes a request: stops new unlocks and pending reminders. Purchases, quotes and audit history are kept. */
export async function closeRfq(rfqId: string, actorId: string | null, reason: string) {
  const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: rfqId }, include: { opportunity: true } });
  if (["CLOSED", "CANCELLED", "EXPIRED"].includes(rfq.status)) return;
  await prisma.$transaction(async (tx) => {
    await setRfqStatus(tx, rfqId, "CLOSED", { actorId, note: reason, force: true });
    await tx.rfq.update({ where: { id: rfqId }, data: { closedAt: new Date(), closeReason: reason } });
    if (rfq.opportunity && ["AVAILABLE", "PAUSED", "DRAFT"].includes(rfq.opportunity.status)) {
      await tx.opportunity.update({ where: { id: rfq.opportunity.id }, data: { status: "WITHDRAWN" } });
    }
    await tx.rfqReservation.updateMany({ where: { rfqId, status: "ACTIVE" }, data: { status: "RELEASED", releasedReason: "Request closed" } });
    await tx.backgroundJob.deleteMany({ where: { status: "QUEUED", dedupeKey: { startsWith: `remind:${rfqId}` } } });
  });
  await trackEvent("RfqClosed", { rfqId, props: { reason }, isDemo: rfq.isDemo });
}

/** Called when a quote is first submitted: schedule up to two "you have an unopened quote" reminders. */
export async function scheduleQuoteReminders(quoteId: string, rfqId: string) {
  const s = await marketplaceSettings();
  for (const [i, hours] of s.quoteReminderHours.entries()) {
    await enqueue("buyer.quote_reminder", { quoteId, n: i + 1 }, { dedupeKey: `remind:${rfqId}:quote:${quoteId}:${i + 1}`, runAt: new Date(Date.now() + hours * 3_600_000) });
  }
}

export async function buyerQuoteReminder(quoteId: string, n: number) {
  const q = await prisma.quote.findUnique({ where: { id: quoteId }, include: { rfq: true, seller: true } });
  if (!q || q.viewedAt || q.status === "WITHDRAWN" || CLOSED.includes(q.rfq.status) || q.rfq.remindersOptOut) return "skipped";
  await notifyBuyer(
    q.rfqId,
    `quote_reminder:${q.id}:${n}`,
    n === 1 ? "You have a quotation waiting" : "Your quotation is still waiting",
    `${q.seller.tradingName ?? q.seller.legalName} sent you an itemised quote. Review it, ask a question or decline — there's no obligation to order.`,
  );
  return "sent";
}

export async function sellerQuoteReminder(rfqId: string, sellerId: string) {
  const rfq = await prisma.rfq.findUnique({ where: { id: rfqId } });
  const quote = await prisma.quote.findUnique({ where: { rfqId_sellerId: { rfqId, sellerId } } });
  if (!rfq || CLOSED.includes(rfq.status) || (quote && quote.status !== "DRAFT")) return "skipped";
  const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller) return "skipped";
  await notify({
    userIds: await orgUserIds(seller.orgId), type: "seller_reminder", title: `Send your quote for ${rfq.publicRef}`,
    body: "You unlocked this request but haven't quoted yet. Buyers usually choose among the first complete quotes they receive.", link: `/seller/opportunities/${rfqId}`, dedupeKey: `seller-reminder:${rfqId}:${sellerId}`,
  });
  return "sent";
}

/** Maintenance: READY_FOR_QUOTES confirmations older than the expiry window become EXPIRED (tier re-evaluated). */
export async function expireStaleIntent() {
  const s = await marketplaceSettings();
  const cutoff = new Date(Date.now() - s.intentExpiryDays * 86_400_000);
  const stale = await prisma.rfq.findMany({ where: { intentStatus: { in: ["READY_FOR_QUOTES", "RESEARCHING"] }, intentConfirmedAt: { lt: cutoff } }, select: { id: true }, take: 200 });
  for (const r of stale) {
    await prisma.rfq.update({ where: { id: r.id }, data: { intentStatus: "EXPIRED" } });
    await refreshPricingTier(r.id);
  }
  return stale.length;
}

/** Buyer stops reminder emails for one request (link in emails or dashboard). */
export async function setReminderOptOut(rfqId: string, optOut: boolean, actorId: string | null) {
  await prisma.rfq.update({ where: { id: rfqId }, data: { remindersOptOut: optOut } });
  await audit(actorId, optOut ? "rfq.reminders_off" : "rfq.reminders_on", "Rfq", rfqId);
}

/**
 * Buyer changes their contact-privacy choice. Applies from now on: details already shared under an
 * earlier choice cannot be recalled, but no further manufacturer receives them unless allowed.
 */
export async function updatePrivacyPreference(rfqId: string, mode: "PLATFORM_MESSAGING_ONLY" | "BUYER_SELECTED" | "FULL_CONTACT", consentDirect: boolean, actor: { userId: string | null; email: string; ip?: string }) {
  if (mode !== "PLATFORM_MESSAGING_ONLY" && !consentDirect) throw new DomainError("CONSENT", "Direct contact sharing needs your explicit consent.");
  const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: rfqId } });
  await prisma.$transaction(async (tx) => {
    await tx.rfq.update({ where: { id: rfqId }, data: { disclosureMode: mode } });
    await tx.consentRecord.create({ data: { kind: "DATA_SHARING", granted: true, email: actor.email, userId: actor.userId, rfqId, textVersion: `privacy-change:${mode}`, textHash: sha256(`privacy:${mode}:${rfq.maxRecipients}`), maxRecipients: rfq.maxRecipients, disclosureMode: mode, ipAddress: actor.ip } });
    await audit(actor.userId, "rfq.privacy", "Rfq", rfqId, { from: rfq.disclosureMode, to: mode }, tx);
  });
}

/** Option B: the buyer shares direct contact details with one specific manufacturer they're talking to. */
export async function shareContactWithSeller(rfqId: string, sellerId: string, actor: { userId: string; email: string }) {
  const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: rfqId } });
  const conv = await prisma.conversation.findUnique({ where: { rfqId_sellerId: { rfqId, sellerId } } });
  const unlock = await prisma.rfqUnlock.findUnique({ where: { rfqId_sellerId: { rfqId, sellerId } } });
  if (!conv || unlock?.status !== "ACTIVE") throw new DomainError("NOT_FOUND", "You can share details only with a manufacturer working on this request.");
  if (rfq.disclosureMode === "PLATFORM_MESSAGING_ONLY") throw new DomainError("PRIVATE", "Your request is set to private. Change your privacy choice to “Share only with manufacturers I select” first.");
  if (conv.contactSharedAt || rfq.disclosureMode === "FULL_CONTACT") return;
  await prisma.$transaction(async (tx) => {
    await tx.conversation.update({ where: { id: conv.id }, data: { contactSharedAt: new Date() } });
    await tx.dataDisclosureEvent.create({ data: { rfqId, sellerId, unlockId: unlock.id, actorId: actor.userId, fields: ["name", "company", "email", "phone", "website"], reason: "BUYER_SELECTED" } });
    await tx.consentRecord.create({ data: { kind: "DATA_SHARING", granted: true, email: actor.email, userId: actor.userId, rfqId, textVersion: `share-with:${sellerId}`, textHash: sha256(`share-contact:${rfqId}:${sellerId}`), disclosureMode: "BUYER_SELECTED" } });
    await tx.message.create({ data: { conversationId: conv.id, side: "SYSTEM", kind: "CONTACT_SHARED", body: "The buyer shared their direct contact details with you. You'll find them on the request page." } });
    await tx.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: new Date() } });
    await audit(actor.userId, "rfq.share_contact", "Rfq", rfqId, { sellerId }, tx);
  });
  const seller = await prisma.sellerProfile.findUniqueOrThrow({ where: { id: sellerId } });
  await notify({ userIds: await orgUserIds(seller.orgId), type: "contact_shared", title: `Buyer shared contact details · ${rfq.publicRef}`, body: "You can now contact the buyer directly as well as on PatchMatch.", link: `/seller/opportunities/${rfqId}`, dedupeKey: `contact-shared:${rfqId}:${sellerId}` });
}
