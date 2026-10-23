import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { processRfq, adminQualifyRfq } from "@/lib/domain/rfq";
import { runMatching, publishOpportunity } from "@/lib/domain/matching";
import { sellerRfqView, sellerAccess } from "@/lib/domain/access";
import { startUnlock, applyProviderPaymentStatus, expireReservations } from "@/lib/domain/unlock";
import { handlePaymentWebhook } from "@/lib/domain/webhooks";
import { buildSandboxEvent, SANDBOX_SIGNATURE_HEADER } from "@/lib/services/payments/sandbox";
import { saveQuote, buyerQuoteAction } from "@/lib/domain/quotes";
import { postMessage } from "@/lib/domain/messages";
import { fileDispute, decideDispute } from "@/lib/domain/finance";
import { makeSeller, makeUser, submitVerifiedRfq } from "./helpers";

async function truncateAll() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
}

async function qualifiedPublishedRfq(admin: { id: string }, over = {}, only?: string[]) {
  // Isolate: only the given sellers (or those created for this test) are available for matching.
  if (only) {
    await prisma.sellerProfile.updateMany({ where: { id: { notIn: only } }, data: { availability: "PAUSED" } });
    await prisma.sellerProfile.updateMany({ where: { id: { in: only } }, data: { availability: "ACTIVE" } });
  }
  const rfq = await submitVerifiedRfq(over);
  await processRfq(rfq.id);
  await adminQualifyRfq(admin.id, rfq.id, { tier: "A", pricingTier: "HIGH_INTENT" });
  await runMatching(rfq.id, admin.id);
  await publishOpportunity(rfq.id, admin.id, { distributionMode: "EXCLUSIVE" });
  return prisma.rfq.findUniqueOrThrow({ where: { id: rfq.id }, include: { opportunity: true } });
}

function webhook(providerRef: string, status: "PAID" | "FAILED", amountMinor: number, currency = "USD") {
  const { body, signature } = buildSandboxEvent(providerRef, status, amountMinor, currency);
  return handlePaymentWebhook("sandbox", body, new Headers({ [SANDBOX_SIGNATURE_HEADER]: signature }));
}

let admin: Awaited<ReturnType<typeof makeUser>>;

beforeAll(async () => {
  await truncateAll();
  admin = await makeUser({ role: "SUPER_ADMIN" });
});

describe("critical workflow: RFQ → verify → qualify → match → anonymised opportunity → paid unlock → disclosure → quote", () => {
  it("runs end to end with payment failure, retry, verified payment and quotation", async () => {
    const a = await makeSeller();
    const outsider = await makeSeller({ patchType: "PVC" }); // cannot make embroidered → never matched
    const rfq = await qualifiedPublishedRfq(admin);

    expect(rfq.status).toBe("SELLER_NOTIFIED");
    expect(rfq.opportunity?.status).toBe("AVAILABLE");
    expect(rfq.opportunity?.priceMinor).toBe(1250); // Contact-Ready pilot default ($12.50)
    expect(rfq.opportunity?.maxUnlocks).toBe(1);

    // Non-matching seller has no access at all.
    expect(await sellerRfqView(outsider.seller.id, rfq.id)).toBeNull();

    // Matching seller sees an anonymised preview.
    const locked = await sellerRfqView(a.seller.id, rfq.id);
    expect(locked?.view.locked).toBe(true);
    expect(locked?.view.contact).toBeNull();
    expect(JSON.stringify(locked)).not.toContain(rfq.contactEmail);
    expect(JSON.stringify(locked)).not.toContain("90012");

    // Card attempt #1 → payment fails → still locked, reservation released.
    const first = await startUnlock({ sellerId: a.seller.id, orgId: a.org.id, userId: a.user.id, userEmail: a.user.email, rfqId: rfq.id, method: "CARD" });
    expect(first.kind).toBe("redirect");
    const p1 = await prisma.payment.findUniqueOrThrow({ where: { id: (first as { paymentId: string }).paymentId } });
    expect(p1.status).toBe("PENDING");
    expect((await sellerAccess(a.seller.id, rfq.id)).unlocked).toBe(false); // initiation ≠ confirmation
    expect((await webhook(p1.providerRef!, "FAILED", p1.amountMinor)).status).toBe(200);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: p1.id } })).status).toBe("FAILED");
    expect((await sellerAccess(a.seller.id, rfq.id)).unlocked).toBe(false);
    expect(await prisma.rfqReservation.count({ where: { rfqId: rfq.id, status: "ACTIVE" } })).toBe(0);

    // A forged webhook (bad signature) is rejected and changes nothing.
    const forged = await handlePaymentWebhook("sandbox", JSON.stringify({ eventId: "evt_forged", providerRef: p1.providerRef, status: "PAID", amountMinor: 1250, currency: "USD" }), new Headers({ [SANDBOX_SIGNATURE_HEADER]: "t=1,v1=deadbeef" }));
    expect(forged.status).toBe(400);

    // Card attempt #2 → verified PAID webhook → unlocked.
    const second = await startUnlock({ sellerId: a.seller.id, orgId: a.org.id, userId: a.user.id, userEmail: a.user.email, rfqId: rfq.id, method: "CARD" });
    const p2 = await prisma.payment.findUniqueOrThrow({ where: { id: (second as { paymentId: string }).paymentId } });
    // Wrong amount → disputed, no access.
    const mismatch = await applyProviderPaymentStatus("sandbox", p2.providerRef!, "PAID", 1, "USD", "test");
    expect(mismatch.ok).toBe(true);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: p2.id } })).status).toBe("DISPUTED");
    expect((await sellerAccess(a.seller.id, rfq.id)).unlocked).toBe(false);

    await prisma.rfqReservation.updateMany({ where: { paymentId: p2.id }, data: { status: "RELEASED" } });
    const third = await startUnlock({ sellerId: a.seller.id, orgId: a.org.id, userId: a.user.id, userEmail: a.user.email, rfqId: rfq.id, method: "CARD" });
    const p3 = await prisma.payment.findUniqueOrThrow({ where: { id: (third as { paymentId: string }).paymentId } });
    expect((await webhook(p3.providerRef!, "PAID", p3.amountMinor)).status).toBe(200);
    // Replayed webhook is idempotent.
    expect((await webhook(p3.providerRef!, "PAID", p3.amountMinor)).status).toBe(200);
    expect(await prisma.rfqUnlock.count({ where: { rfqId: rfq.id, status: "ACTIVE" } })).toBe(1);

    const unlocked = await sellerRfqView(a.seller.id, rfq.id);
    expect(unlocked?.view.locked).toBe(false);
    expect(unlocked?.view.contact?.email).toBe(rfq.contactEmail);
    expect(unlocked?.view.spec.destinationPostal).toBe("90012");
    const disclosure = await prisma.dataDisclosureEvent.findFirstOrThrow({ where: { rfqId: rfq.id, sellerId: a.seller.id } });
    expect(disclosure.fields).toEqual(expect.arrayContaining(["email", "phone"]));
    const opp = await prisma.opportunity.findUniqueOrThrow({ where: { rfqId: rfq.id } });
    expect(opp.status).toBe("SOLD_OUT");
    const unlock = await prisma.rfqUnlock.findFirstOrThrow({ where: { rfqId: rfq.id } });
    expect(unlock.receiptNumber).toMatch(/^R-\d{4}-/);

    // Quotation → buyer compares and selects.
    const quote = await saveQuote({
      sellerId: a.seller.id, userId: a.user.id, rfqId: rfq.id, submit: true,
      input: { quantity: 500, unitPrice: 1.2, setupFee: 30, sampleFee: 0, toolingFee: 0, artworkFee: 0, shipping: 60, currency: "USD", productionDays: 12, validDays: 30 },
    });
    expect(quote.status).toBe("SUBMITTED");
    expect(quote.totalMinor).toBe(60_000 + 3_000 + 6_000);
    expect((await prisma.rfq.findUniqueOrThrow({ where: { id: rfq.id } })).status).toBe("QUOTES_RECEIVED");
    await postMessage({ rfqId: rfq.id, sellerId: a.seller.id, side: "SELLER", userId: a.user.id, body: "Thanks — proof attached soon." });
    await buyerQuoteAction({ rfqId: rfq.id, quoteId: quote.id, userId: admin.id, action: "SELECT" });
    expect((await prisma.rfq.findUniqueOrThrow({ where: { id: rfq.id } })).status).toBe("SELLER_SELECTED");
  });
});

describe("exclusive RFQs cannot be oversold", () => {
  it("allows exactly one of many concurrent credit purchases", async () => {
    const sellers = await Promise.all(Array.from({ length: 4 }, () => makeSeller({ credits: 10_000 })));
    const rfq = await qualifiedPublishedRfq(admin, {}, sellers.map((s) => s.seller.id));
    const notified = await prisma.rfqMatch.findMany({ where: { rfqId: rfq.id, status: "NOTIFIED" } });
    expect(notified.length).toBeGreaterThanOrEqual(2);
    const contenders = sellers.filter((s) => notified.some((n) => n.sellerId === s.seller.id));
    // Each contender fires several attempts simultaneously.
    const attempts = contenders.flatMap((s) => Array.from({ length: 3 }, () => startUnlock({ sellerId: s.seller.id, orgId: s.org.id, userId: s.user.id, userEmail: s.user.email, rfqId: rfq.id, method: "CREDITS" })));
    const results = await Promise.allSettled(attempts);
    const ok = results.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(1);
    expect(await prisma.rfqUnlock.count({ where: { rfqId: rfq.id } })).toBe(1);
    const opp = await prisma.opportunity.findUniqueOrThrow({ where: { rfqId: rfq.id } });
    expect(opp.unlockCount).toBe(1);
    // Exactly one debit across all wallets.
    const debits = await prisma.walletLedgerEntry.count({ where: { type: "UNLOCK_DEBIT", unlock: { rfqId: rfq.id } } });
    expect(debits).toBe(1);
    const balances = await prisma.wallet.findMany({ where: { orgId: { in: contenders.map((c) => c.org.id) } } });
    expect(balances.reduce((a, w) => a + w.balanceMinor, 0)).toBe(contenders.length * 10_000 - 1250);
  });

  it("credits a seller whose card payment confirms after the RFQ sold out", async () => {
    const s1 = await makeSeller({ credits: 5000 });
    const s2 = await makeSeller();
    const rfq = await qualifiedPublishedRfq(admin, {}, [s1.seller.id, s2.seller.id]);
    const card = await startUnlock({ sellerId: s2.seller.id, orgId: s2.org.id, userId: s2.user.id, userEmail: s2.user.email, rfqId: rfq.id, method: "CARD" });
    const p = await prisma.payment.findUniqueOrThrow({ where: { id: (card as { paymentId: string }).paymentId } });
    // s1 cannot buy while s2 holds the reservation…
    await expect(startUnlock({ sellerId: s1.seller.id, orgId: s1.org.id, userId: s1.user.id, userEmail: s1.user.email, rfqId: rfq.id, method: "CREDITS" })).rejects.toThrow(/Another manufacturer/);
    // …until it expires.
    await prisma.rfqReservation.updateMany({ where: { paymentId: p.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expireReservations();
    const won = await startUnlock({ sellerId: s1.seller.id, orgId: s1.org.id, userId: s1.user.id, userEmail: s1.user.email, rfqId: rfq.id, method: "CREDITS" });
    expect(won.kind).toBe("unlocked");
    // s2's late payment confirmation must not oversell; it is credited back.
    const late = await applyProviderPaymentStatus("sandbox", p.providerRef!, "PAID", p.amountMinor, "USD", "test");
    expect(late.ok && late.creditedBack).toBe(true);
    expect(await prisma.rfqUnlock.count({ where: { rfqId: rfq.id, status: "ACTIVE" } })).toBe(1);
    expect((await sellerAccess(s2.seller.id, rfq.id)).unlocked).toBe(false);
    expect((await prisma.wallet.findUniqueOrThrow({ where: { orgId: s2.org.id } })).balanceMinor).toBe(p.amountMinor);
  });
});

describe("access control and limits", () => {
  it("unverified sellers are never matched and cannot purchase", async () => {
    const pending = await makeSeller({ verified: false, credits: 5000 });
    const other = await makeSeller();
    const rfq = await qualifiedPublishedRfq(admin, {}, [pending.seller.id, other.seller.id]);
    const m = await prisma.rfqMatch.findUnique({ where: { rfqId_sellerId: { rfqId: rfq.id, sellerId: pending.seller.id } } });
    expect(m).toBeNull(); // only verified sellers are evaluated
    expect(await sellerRfqView(pending.seller.id, rfq.id)).toBeNull();
    await expect(startUnlock({ sellerId: pending.seller.id, orgId: pending.org.id, userId: pending.user.id, userEmail: pending.user.email, rfqId: rfq.id, method: "CREDITS" })).rejects.toThrow(/verified/);
  });

  it("insufficient credits leave the RFQ protected and the wallet untouched", async () => {
    const poor = await makeSeller({ credits: 500 });
    const rfq = await qualifiedPublishedRfq(admin, {}, [poor.seller.id]);
    await expect(startUnlock({ sellerId: poor.seller.id, orgId: poor.org.id, userId: poor.user.id, userEmail: poor.user.email, rfqId: rfq.id, method: "CREDITS" })).rejects.toThrow(/Insufficient/);
    expect((await prisma.wallet.findUniqueOrThrow({ where: { orgId: poor.org.id } })).balanceMinor).toBe(500);
    expect((await sellerAccess(poor.seller.id, rfq.id)).unlocked).toBe(false);
    expect(await prisma.rfqReservation.count({ where: { rfqId: rfq.id, status: "ACTIVE" } })).toBe(0);
  });

  it("messaging-only consent masks contact details typed in chat", async () => {
    const s = await makeSeller({ credits: 5000 });
    const rfq = await qualifiedPublishedRfq(admin, { disclosureMode: "PLATFORM_MESSAGING_ONLY" }, [s.seller.id]);
    await startUnlock({ sellerId: s.seller.id, orgId: s.org.id, userId: s.user.id, userEmail: s.user.email, rfqId: rfq.id, method: "CREDITS" });
    const view = await sellerRfqView(s.seller.id, rfq.id);
    expect(view?.view.contact?.email).toBeNull();
    const { message, redacted } = await postMessage({ rfqId: rfq.id, sellerId: s.seller.id, side: "SELLER", userId: s.user.id, body: "WhatsApp me on +92 300 1234567" });
    expect(redacted).toBe(true);
    expect(message.body).not.toContain("1234567");
  });
});

describe("dispute → credit decision → ledger", () => {
  it("records a credit and updates the wallet ledger", async () => {
    const s = await makeSeller({ credits: 5000 });
    const rfq = await qualifiedPublishedRfq(admin, {}, [s.seller.id]);
    const r = await startUnlock({ sellerId: s.seller.id, orgId: s.org.id, userId: s.user.id, userEmail: s.user.email, rfqId: rfq.id, method: "CREDITS" });
    const unlockId = (r as { unlockId: string }).unlockId;
    expect((await prisma.wallet.findUniqueOrThrow({ where: { orgId: s.org.id } })).balanceMinor).toBe(3750);
    const d = await fileDispute({ sellerId: s.seller.id, userId: s.user.id, unlockId, reason: "INVALID_CONTACT", description: "The phone number is disconnected and email bounced twice." });
    await expect(fileDispute({ sellerId: s.seller.id, userId: s.user.id, unlockId, reason: "INVALID_CONTACT", description: "Duplicate claim for the same purchase here." })).rejects.toThrow(/already open/);
    await decideDispute({ adminId: admin.id, disputeId: d.id, decision: "CREDIT", note: "Verified bounce — credit issued." });
    expect((await prisma.wallet.findUniqueOrThrow({ where: { orgId: s.org.id } })).balanceMinor).toBe(5000);
    expect((await prisma.rfqUnlock.findUniqueOrThrow({ where: { id: unlockId } })).status).toBe("CREDITED");
    expect((await prisma.dispute.findUniqueOrThrow({ where: { id: d.id } })).status).toBe("RESOLVED_CREDIT");
    const ledger = await prisma.walletLedgerEntry.findMany({ where: { wallet: { orgId: s.org.id } }, orderBy: { createdAt: "asc" } });
    expect(ledger.map((e) => e.type)).toEqual(["ADJUSTMENT", "UNLOCK_DEBIT", "REFUND_CREDIT"]);
    expect(ledger.at(-1)?.balanceAfter).toBe(5000);
    await expect(decideDispute({ adminId: admin.id, disputeId: d.id, decision: "CREDIT", note: "again please" })).rejects.toThrow(/already been decided/);
    expect(await prisma.auditLog.count({ where: { entityId: d.id } })).toBeGreaterThanOrEqual(2);
  });
});

describe("buyer consent decides how many manufacturers can receive a request", () => {
  const setShared = (enabled: boolean) => prisma.featureFlag.upsert({ where: { key: "limited_shared_rfqs" }, create: { key: "limited_shared_rfqs", enabled, description: "test" }, update: { enabled } });

  it("stays exclusive while limited sharing is disabled, even if the buyer asked for 3", async () => {
    await setShared(false);
    const rfq = await submitVerifiedRfq({ maxRecipients: 3, leadSource: "marketplace" } as never);
    expect(rfq.maxRecipients).toBe(1);
  });

  it("allows up to 3 only for marketplace buyers who chose it; landing-page leads are always single", async () => {
    await setShared(true);
    try {
      const shared = await submitVerifiedRfq({ maxRecipients: 3, leadSource: "marketplace" } as never);
      const exclusive = await submitVerifiedRfq({ maxRecipients: 1, leadSource: "marketplace" } as never);
      const landing = await submitVerifiedRfq({ maxRecipients: 3, leadSource: "landing:custom-patch-quote" } as never);
      expect(shared.maxRecipients).toBe(3);
      expect(exclusive.maxRecipients).toBe(1);
      expect(landing.maxRecipients).toBe(1);
      expect(landing.leadSource).toBe("landing:custom-patch-quote");
      const consent = await prisma.consentRecord.findFirstOrThrow({ where: { rfqId: shared.id, kind: "DATA_SHARING" } });
      expect(consent.maxRecipients).toBe(3);

      // A shared listing can never exceed the buyer's consent, and an exclusive one can't be published as shared.
      const { seller } = await makeSeller({ credits: 10_000 });
      for (const r of [shared, exclusive]) {
        await processRfq(r.id);
        await adminQualifyRfq(null, r.id, { tier: "A", pricingTier: "STANDARD", source: "SYSTEM" });
        await runMatching(r.id);
      }
      const opp = await publishOpportunity(shared.id, null, { distributionMode: "LIMITED_SHARED", maxUnlocks: 10 });
      expect(opp.maxUnlocks).toBe(3);
      await expect(publishOpportunity(exclusive.id, null, { distributionMode: "LIMITED_SHARED", maxUnlocks: 2 })).rejects.toThrow(/consented/);
      expect(seller.id).toBeTruthy();
    } finally {
      await setShared(false);
    }
  });

  it("public activity events never contain buyer identity", async () => {
    const rfq = await submitVerifiedRfq({ contactName: "Zelda Q Private", contactCompany: "Hidden Brand Co", contactPhone: "+1 312 555 0199" });
    const events = await prisma.activityEvent.findMany({ where: { rfqId: rfq.id } });
    expect(events.some((e) => e.kind === "RFQ_POSTED")).toBe(true);
    const text = JSON.stringify(events);
    for (const secret of ["Zelda", "Hidden Brand", "555 0199", rfq.contactEmail]) expect(text).not.toContain(secret);
  });
});
