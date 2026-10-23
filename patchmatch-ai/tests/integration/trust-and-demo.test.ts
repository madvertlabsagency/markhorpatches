import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { processRfq, adminQualifyRfq } from "@/lib/domain/rfq";
import { runMatching, publishOpportunity } from "@/lib/domain/matching";
import { sellerRfqView } from "@/lib/domain/access";
import { startUnlock } from "@/lib/domain/unlock";
import { saveQuote } from "@/lib/domain/quotes";
import { postMessage } from "@/lib/domain/messages";
import { fileDispute } from "@/lib/domain/finance";
import { buyerQuoteReminder, closeRfq, confirmIntent, setReminderOptOut, shareContactWithSeller, updatePrivacyPreference } from "@/lib/domain/engagement";
import { queueEmail } from "@/lib/notifications";
import { assertDemo } from "@/lib/demo/settings";
import { saveMarketplaceSettings, marketplaceSettings } from "@/lib/settings";
import { makeSeller, makeUser, submitVerifiedRfq } from "./helpers";
import type { RfqSubmission } from "@/lib/rfq/schema";

let admin: Awaited<ReturnType<typeof makeUser>>;
beforeAll(async () => {
  admin = await makeUser({ role: "SUPER_ADMIN" });
});

async function published(over: Partial<RfqSubmission>, only: string[], pricingTier: "STANDARD" | "HIGH_INTENT" = "STANDARD") {
  await prisma.sellerProfile.updateMany({ where: { id: { notIn: only } }, data: { availability: "PAUSED" } });
  await prisma.sellerProfile.updateMany({ where: { id: { in: only } }, data: { availability: "ACTIVE" } });
  const rfq = await submitVerifiedRfq(over);
  await processRfq(rfq.id);
  await adminQualifyRfq(admin.id, rfq.id, { tier: "A", pricingTier });
  await runMatching(rfq.id, admin.id);
  await publishOpportunity(rfq.id, admin.id, { distributionMode: "EXCLUSIVE" });
  return prisma.rfq.findUniqueOrThrow({ where: { id: rfq.id }, include: { opportunity: true } });
}
const unlock = (s: Awaited<ReturnType<typeof makeSeller>>, rfqId: string) => startUnlock({ sellerId: s.seller.id, orgId: s.org.id, userId: s.user.id, userEmail: s.user.email, rfqId, method: "CREDITS" });
const quote = (s: Awaited<ReturnType<typeof makeSeller>>, rfqId: string) =>
  saveQuote({
    sellerId: s.seller.id, userId: s.user.id, rfqId, submit: true,
    input: { quantity: 500, unitPrice: 1.2, setupFee: 0, sampleFee: 0, toolingFee: 0, artworkFee: 0, shipping: 40, currency: "USD", productionDays: 10, deliveryEstimate: "5 days", samplePolicy: "Digital proof", paymentTerms: "50/50", revisionPolicy: "Unlimited", notes: "", validDays: 30 },
  } as never);

describe("buyer privacy options A / B / C", () => {
  it("A (platform messaging only) never releases contact details and masks them in chat", async () => {
    const s = await makeSeller({ credits: 5000 });
    const rfq = await published({ disclosureMode: "PLATFORM_MESSAGING_ONLY", consentDirectContact: false }, [s.seller.id]);
    await unlock(s, rfq.id);
    const v = await sellerRfqView(s.seller.id, rfq.id);
    expect(v?.view.contact?.email ?? null).toBeNull();
    expect(v?.view.contact?.phone ?? null).toBeNull();
    const { message } = await postMessage({ rfqId: rfq.id, sellerId: s.seller.id, side: "BUYER", userId: admin.id, body: "Email me at jordan@northloop.com" });
    expect(message.body).not.toContain("jordan@northloop.com");
    await expect(shareContactWithSeller(rfq.id, s.seller.id, { userId: admin.id, email: "x@y.com" })).rejects.toThrow(/private/);
  });

  it("B (buyer selected) releases details only to the chosen manufacturer, after the buyer shares", async () => {
    const a = await makeSeller({ credits: 5000 });
    const rfq = await published({ disclosureMode: "BUYER_SELECTED", consentDirectContact: true }, [a.seller.id]);
    await unlock(a, rfq.id);
    expect((await sellerRfqView(a.seller.id, rfq.id))?.view.contact?.email ?? null).toBeNull();
    const masked = await postMessage({ rfqId: rfq.id, sellerId: a.seller.id, side: "SELLER", userId: a.user.id, body: "Call me on +92 300 7654321" });
    expect(masked.redacted).toBe(true);
    await shareContactWithSeller(rfq.id, a.seller.id, { userId: admin.id, email: rfq.contactEmail });
    expect((await sellerRfqView(a.seller.id, rfq.id))?.view.contact?.email).toBe(rfq.contactEmail);
    const open = await postMessage({ rfqId: rfq.id, sellerId: a.seller.id, side: "SELLER", userId: a.user.id, body: "Call me on +92 300 7654321" });
    expect(open.redacted).toBe(false);
    expect(await prisma.dataDisclosureEvent.count({ where: { rfqId: rfq.id, sellerId: a.seller.id, reason: "BUYER_SELECTED" } })).toBe(1);
  });

  it("C (full contact) releases details on unlock; B and C require explicit separate consent", async () => {
    const s = await makeSeller({ credits: 5000 });
    const rfq = await published({ disclosureMode: "FULL_CONTACT", consentDirectContact: true }, [s.seller.id]);
    await unlock(s, rfq.id);
    expect((await sellerRfqView(s.seller.id, rfq.id))?.view.contact?.email).toBe(rfq.contactEmail);
    await expect(submitVerifiedRfq({ disclosureMode: "FULL_CONTACT", consentDirectContact: false })).rejects.toThrow();
    await expect(updatePrivacyPreference(rfq.id, "BUYER_SELECTED", false, { userId: null, email: rfq.contactEmail })).rejects.toThrow(/consent/);
  });
});

describe("manufacturer messaging boundaries", () => {
  it("a manufacturer cannot message before unlocking or see another manufacturer's buyer details", async () => {
    const a = await makeSeller({ credits: 5000 });
    const b = await makeSeller({ credits: 5000 });
    const rfq = await published({ disclosureMode: "FULL_CONTACT", consentDirectContact: true }, [a.seller.id, b.seller.id]);
    await expect(postMessage({ rfqId: rfq.id, sellerId: a.seller.id, side: "SELLER", userId: a.user.id, body: "Hello" })).rejects.toThrow(/Unlock/);
    await unlock(a, rfq.id);
    // Exclusive: B can neither unlock nor read the buyer's contact details or A's conversation.
    await expect(unlock(b, rfq.id)).rejects.toThrow();
    expect((await sellerRfqView(b.seller.id, rfq.id))?.view.contact?.email ?? null).toBeNull();
    await expect(postMessage({ rfqId: rfq.id, sellerId: b.seller.id, side: "SELLER", userId: b.user.id, body: "Hi" })).rejects.toThrow();
  });
});

describe("buyer intent and pilot pricing", () => {
  it("re-confirmed intent upgrades an unsold listing from $10 to $12.50; 'found a supplier' closes it", async () => {
    const s = await makeSeller({ credits: 5000 });
    const rfq = await published({}, [s.seller.id], "STANDARD");
    expect(rfq.opportunity?.priceMinor).toBe(1000);
    await confirmIntent(rfq.id, "READY", { via: "email_link" });
    const after = await prisma.opportunity.findUniqueOrThrow({ where: { rfqId: rfq.id } });
    expect(after.priceMinor).toBe(1250);
    expect(await prisma.consentRecord.count({ where: { rfqId: rfq.id, textVersion: "intent:READY_FOR_QUOTES" } })).toBe(1);

    await confirmIntent(rfq.id, "FOUND_SUPPLIER", { via: "email_link" });
    const closed = await prisma.rfq.findUniqueOrThrow({ where: { id: rfq.id }, include: { opportunity: true } });
    expect(closed.status).toBe("CLOSED");
    expect(closed.opportunity?.status).toBe("WITHDRAWN");
    await expect(unlock(s, rfq.id)).rejects.toThrow();
  });
});

describe("quote reminders", () => {
  it("are scheduled on the first quote and stop on opt-out or when the request closes", async () => {
    const s = await makeSeller({ credits: 5000 });
    const rfq = await published({}, [s.seller.id]);
    await unlock(s, rfq.id);
    const q = await quote(s, rfq.id);
    expect(await prisma.backgroundJob.count({ where: { type: "buyer.quote_reminder", dedupeKey: { startsWith: `remind:${rfq.id}` } } })).toBe(2);
    await setReminderOptOut(rfq.id, true, null);
    expect(await buyerQuoteReminder(q.id, 1)).toBe("skipped");
    await setReminderOptOut(rfq.id, false, null);
    expect(await buyerQuoteReminder(q.id, 1)).toBe("sent");
    await closeRfq(rfq.id, null, "Buyer closed the request");
    expect(await prisma.backgroundJob.count({ where: { status: "QUEUED", dedupeKey: { startsWith: `remind:${rfq.id}` } } })).toBe(0);
    expect(await buyerQuoteReminder(q.id, 2)).toBe("skipped");
  });
});

describe("quality-claim window", () => {
  const original = marketplaceSettings();
  afterEach(async () => saveMarketplaceSettings(await original));

  it("rejects claims filed after the configured window", async () => {
    const s = await makeSeller({ credits: 5000 });
    const rfq = await published({}, [s.seller.id]);
    const r = (await unlock(s, rfq.id)) as { unlockId: string };
    await prisma.rfqUnlock.update({ where: { id: r.unlockId }, data: { createdAt: new Date(Date.now() - 8 * 86_400_000) } });
    const desc = "The phone number is disconnected and the email bounced twice.";
    await expect(fileDispute({ sellerId: s.seller.id, userId: s.user.id, unlockId: r.unlockId, reason: "INVALID_CONTACT", description: desc })).rejects.toThrow(/within 7 days/);
    await saveMarketplaceSettings({ ...(await original), claimWindowDays: 10 });
    await expect(fileDispute({ sellerId: s.seller.id, userId: s.user.id, unlockId: r.unlockId, reason: "INVALID_CONTACT", description: desc })).resolves.toBeTruthy();
  });
});

describe("demo isolation", () => {
  const prev = process.env.DEMO_MODE;
  afterEach(() => {
    process.env.DEMO_MODE = prev;
  });

  it("demo tools refuse to run outside DEMO_MODE", () => {
    process.env.DEMO_MODE = "false";
    expect(() => assertDemo()).toThrow(/DEMO_MODE/);
    process.env.DEMO_MODE = "true";
    expect(() => assertDemo()).not.toThrow();
  });

  it("no email is queued in demo mode or for synthetic personas", async () => {
    const key = `iso-${Date.now()}`;
    process.env.DEMO_MODE = "true";
    await queueEmail("real.person@gmail.com", "rfq_verify", {}, `${key}-a`);
    process.env.DEMO_MODE = "false";
    await queueEmail("demo-buyer@example.com", "rfq_verify", {}, `${key}-b`);
    await queueEmail("buyer9@patchmatch.demo", "rfq_verify", {}, `${key}-c`);
    expect(await prisma.backgroundJob.count({ where: { type: "email.send", dedupeKey: { startsWith: `email:${key}` } } })).toBe(0);
    await queueEmail("real.person@gmail.com", "rfq_verify", {}, `${key}-d`);
    expect(await prisma.backgroundJob.count({ where: { type: "email.send", dedupeKey: { startsWith: `email:${key}` } } })).toBe(1);
  });
});
