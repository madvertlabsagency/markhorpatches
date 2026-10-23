import { describe, expect, it } from "vitest";
import { qualifyRfq, type QualificationInput } from "@/lib/rfq/qualification";
import { evaluateSeller, rankSellers, DEFAULT_WEIGHTS, type MatchSeller, type MatchRfq } from "@/lib/matching/engine";
import { priceOpportunity, selectRule, validateManualPrice, type PricingRuleLike } from "@/lib/pricing/engine";
import { forecastDay, forecastPeriod, DEFAULT_FORECAST } from "@/lib/analytics/forecast";
import { canTransition, assertTransition, PAYMENT_TRANSITIONS, RFQ_TRANSITIONS, QUOTE_TRANSITIONS, OPPORTUNITY_TRANSITIONS } from "@/lib/state-machines";
import { computeQuoteTotals } from "@/lib/quote-math";
import { formatMoney, toMinor } from "@/lib/money";

const NOW = new Date("2026-10-23T12:00:00Z");
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

const strongRfq: QualificationInput = {
  patchType: "EMBROIDERED", quantity: 500, width: 3, height: 3, backing: "IRON_ON", borderType: "MERROWED", colorCount: 5, artworkCount: 1,
  destinationCountry: "US", destinationPostal: "90012", requiredBy: days(45), budgetTotalMinor: 150_000, targetUnitMinor: null, budgetUndisclosed: false,
  notes: "Logo for our spring apparel collection, needs to match brand navy.", artworkNotes: null, contactName: "Jordan Lee", contactEmail: "jordan@gmail.com",
  contactPhone: "+1 213 555 0100", contactCompany: "North Loop Apparel", contactWebsite: null, emailVerified: true, recentDuplicateCount: 0, recentSameIpCount: 0, now: NOW,
};

describe("qualification engine", () => {
  it("classifies a complete, verified request as Tier A and sellable", () => {
    const r = qualifyRfq(strongRfq);
    expect(r.tier).toBe("A");
    expect(r.sellable).toBe(true);
    expect(r.pricingTier).toBe("HIGH_INTENT");
    expect(r.needsHumanReview).toBe(false);
  });

  it("does not penalise free email providers or small quantities", () => {
    const r = qualifyRfq({ ...strongRfq, contactEmail: "a@outlook.com", quantity: 25 });
    expect(r.signals.find((s) => s.category === "fraud")).toBeUndefined();
    expect(["A", "B"]).toContain(r.tier);
  });

  it("is not sellable before email verification", () => {
    const r = qualifyRfq({ ...strongRfq, emailVerified: false });
    expect(r.sellable).toBe(false);
    expect(r.needsHumanReview).toBe(true);
  });

  it("flags disposable emails, gibberish names and link spam as Tier D", () => {
    const r = qualifyRfq({ ...strongRfq, contactEmail: "x@mailinator.com", contactName: "asdfgh", notes: "buy now http://a.com http://b.com" });
    expect(r.tier).toBe("D");
    expect(r.signals.map((s) => s.code)).toEqual(expect.arrayContaining(["DISPOSABLE_EMAIL", "SUSPICIOUS_NAME", "LINK_SPAM"]));
  });

  it("generates clarification questions for missing specs (Tier B/C)", () => {
    const r = qualifyRfq({ ...strongRfq, width: null, height: null, backing: null, artworkCount: 0, requiredBy: null, contactPhone: null, contactCompany: null });
    expect(["B", "C"]).toContain(r.tier);
    expect(r.missingFields).toEqual(expect.arrayContaining(["dimensions", "backing", "artwork", "deadline"]));
    expect(r.clarificationQuestions.length).toBeGreaterThan(0);
  });

  it("flags duplicates", () => {
    const r = qualifyRfq({ ...strongRfq, recentDuplicateCount: 1 });
    expect(r.isDuplicate).toBe(true);
    expect(r.signals.some((s) => s.code === "DUPLICATE_SUBMISSION")).toBe(true);
  });

  it("assigns ENTERPRISE pricing to very large volumes and PREMIUM to large Tier A", () => {
    expect(qualifyRfq({ ...strongRfq, quantity: 30_000 }).pricingTier).toBe("ENTERPRISE");
    expect(qualifyRfq({ ...strongRfq, quantity: 2000 }).pricingTier).toBe("PREMIUM");
  });
});

const rfq: MatchRfq = {
  patchType: "EMBROIDERED", quantity: 500, backing: "IRON_ON", borderType: "MERROWED", destinationCountry: "US", requiredBy: days(40), rush: false,
  hasArtwork: true, budgetTotalMinor: 150_000, targetUnitMinor: null, budgetUndisclosed: false,
};
const seller = (over: Partial<MatchSeller> = {}): MatchSeller => ({
  id: "s1", name: "Lahore Stitch Co", country: "PK", verificationStatus: "VERIFIED", availability: "ACTIVE",
  capabilities: [{ patchType: "EMBROIDERED", moq: 100, maxQuantity: 50_000, weeklyCapacity: 5000, standardDays: 12, rushDays: 6, priceMinMinor: 80, priceMaxMinor: 300 }],
  backingOptions: ["IRON_ON", "SEW_ON"], borderOptions: ["MERROWED"], shippingCountries: ["US", "GB"], artworkSupport: true, rushCapable: true,
  minBudgetMinor: null, yearsOperating: 8, portfolioCount: 5, avgResponseMinutes: null, upheldDisputeRate: null, quotesSubmitted: 0, ...over,
});

describe("matching engine — hard filters", () => {
  it("accepts an eligible seller and explains the score", () => {
    const r = evaluateSeller(rfq, seller(), DEFAULT_WEIGHTS, NOW);
    expect(r.eligible).toBe(true);
    expect(r.score).toBeGreaterThan(60);
    expect(r.explanation).toMatch(/scores/);
    expect(Object.keys(r.breakdown)).toHaveLength(7);
  });

  it.each([
    ["unverified", { verificationStatus: "PENDING_REVIEW" }, /not verified/],
    ["paused", { availability: "PAUSED" }, /paused/],
    ["wrong patch type", { capabilities: [{ patchType: "PVC", moq: 100, standardDays: 10 }] }, /Does not produce/],
    ["MOQ too high", { capabilities: [{ patchType: "EMBROIDERED", moq: 1000, standardDays: 10 }] }, /MOQ/],
    ["no shipping", { shippingCountries: ["GB"] }, /ship/],
    ["too slow", { capabilities: [{ patchType: "EMBROIDERED", moq: 100, standardDays: 60 }], rushCapable: false }, /deadline/],
    ["min budget", { minBudgetMinor: 500_000 }, /minimum project budget/],
  ] as const)("rejects %s", (_name, over, re) => {
    const r = evaluateSeller(rfq, seller(over as Partial<MatchSeller>), DEFAULT_WEIGHTS, NOW);
    expect(r.eligible).toBe(false);
    expect(r.score).toBe(0);
    expect(r.ineligibleReasons.join(" ")).toMatch(re);
  });

  it("allows rush when standard lead time misses but rush fits", () => {
    const r = evaluateSeller({ ...rfq, requiredBy: days(15) }, seller(), DEFAULT_WEIGHTS, NOW);
    expect(r.eligible).toBe(true);
    expect(r.needsRush).toBe(true);
  });

  it("treats domestic sellers as shipping to their own country", () => {
    const r = evaluateSeller(rfq, seller({ country: "US", shippingCountries: [] }), DEFAULT_WEIGHTS, NOW);
    expect(r.eligible).toBe(true);
    expect(r.breakdown.logistics.value).toBe(1);
  });

  it("ranks eligible sellers first, then by score", () => {
    const ranked = rankSellers(rfq, [seller({ id: "bad", verificationStatus: "REJECTED" }), seller({ id: "ok", yearsOperating: 1, portfolioCount: 0 }), seller({ id: "best", avgResponseMinutes: 30 })], DEFAULT_WEIGHTS, NOW);
    expect(ranked.map((r) => r.sellerId)).toEqual(["best", "ok", "bad"]);
  });
});

describe("pricing engine", () => {
  const rule = (over: Partial<PricingRuleLike>): PricingRuleLike => ({ id: "r", tier: "STANDARD", priceMinor: 1500, minMinor: 500, maxMinor: 50_000, discountBps: 0, currency: "USD", priority: 0, active: true, ...over });
  it("falls back to published tier defaults", () => {
    expect(priceOpportunity([], "STANDARD", "PVC", "EXCLUSIVE")?.priceMinor).toBe(1500);
    expect(priceOpportunity([], "HIGH_INTENT", "PVC", "EXCLUSIVE")?.priceMinor).toBe(2000);
    expect(priceOpportunity([], "PREMIUM", "PVC", "EXCLUSIVE")?.priceMinor).toBe(2500);
    expect(priceOpportunity([], "ENTERPRISE", "PVC", "EXCLUSIVE")).toBeNull();
  });
  it("prefers the most specific, highest-priority active rule and applies discounts with clamping", () => {
    const rules = [rule({ id: "generic" }), rule({ id: "pvc", patchType: "PVC", priceMinor: 1800, discountBps: 5000, minMinor: 1200 })];
    expect(selectRule(rules, "STANDARD", "PVC", "EXCLUSIVE")?.id).toBe("pvc");
    const q = priceOpportunity(rules, "STANDARD", "PVC", "EXCLUSIVE")!;
    expect(q.priceMinor).toBe(1200); // 50% off 1800 = 900, clamped to min 1200
    expect(priceOpportunity(rules, "STANDARD", "WOVEN", "EXCLUSIVE")!.ruleId).toBe("generic");
  });
  it("ignores expired and inactive rules", () => {
    const rules = [rule({ id: "old", priceMinor: 999, endsAt: new Date("2020-01-01") }), rule({ id: "off", active: false, priceMinor: 111 })];
    expect(priceOpportunity(rules, "STANDARD", "PVC", "EXCLUSIVE")!.ruleId).toBeNull();
  });
  it("validates manual overrides", () => {
    expect(validateManualPrice(50)).toMatch(/at least/);
    expect(validateManualPrice(2500)).toBeNull();
    expect(validateManualPrice(200_000)).toMatch(/cannot exceed/);
  });
});

describe("forecast simulator", () => {
  it("reproduces the documented illustrative day", () => {
    const d = forecastDay(DEFAULT_FORECAST);
    expect(d.rawLeads).toBe(100);
    expect(d.qualified).toBe(70);
    expect(d.sold).toBe(49);
    expect(d.grossRevenueMinor).toBe(122_500);
    expect(d.adSpendMinor).toBe(30_000);
    expect(d.variableCostMinor).toBe(9_800);
    expect(d.contributionMinor).toBe(82_700);
  });
  it("scales to 30 and 90 days and respects a seller demand cap", () => {
    expect(forecastPeriod(DEFAULT_FORECAST, 30).contributionMinor).toBe(82_700 * 30);
    expect(forecastDay({ ...DEFAULT_FORECAST, sellerDemandCap: 20 }).sold).toBe(20);
  });
});

describe("state machines", () => {
  it("forbids granting a failed payment", () => {
    expect(canTransition(PAYMENT_TRANSITIONS, "FAILED", "PAID")).toBe(false);
    expect(() => assertTransition("payment", PAYMENT_TRANSITIONS, "CANCELLED", "PAID")).toThrow(/Illegal/);
    expect(canTransition(PAYMENT_TRANSITIONS, "PENDING", "PAID")).toBe(true);
  });
  it("enforces RFQ lifecycle order", () => {
    expect(canTransition(RFQ_TRANSITIONS, "VERIFICATION_PENDING", "SELLER_NOTIFIED")).toBe(false);
    expect(canTransition(RFQ_TRANSITIONS, "MATCHING", "MANUAL_SOURCING")).toBe(true);
    expect(canTransition(QUOTE_TRANSITIONS, "ACCEPTED", "REVISED")).toBe(false);
    expect(canTransition(OPPORTUNITY_TRANSITIONS, "WITHDRAWN", "AVAILABLE")).toBe(false);
  });
});

describe("money and quote totals", () => {
  it("uses integer minor units", () => {
    expect(toMinor("1,234.565")).toBe(123457);
    expect(formatMoney(2500)).toBe("$25.00");
    const t = computeQuoteTotals({ quantity: 500, unitPrice: 1.35, setupFee: 40, sampleFee: 0, toolingFee: 0, artworkFee: 0, shipping: 85.5, currency: "USD" });
    expect(t.unitMinor).toBe(135);
    expect(t.totalMinor).toBe(67_500 + 4_000 + 8_550);
    expect(t.lines.map((l) => l.label)).toEqual(["Patches", "Setup", "Shipping"]);
  });
});
