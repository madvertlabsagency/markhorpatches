/**
 * RFQ UNLOCK PRICING — transparent, rule-based.
 * Price = rule base − promotional discount, clamped to the rule's min/max.
 * No hidden fees, no dynamic surge: the listed price is fixed when the opportunity is published
 * and shown before purchase. Enterprise RFQs have no automatic price (admin sets it).
 */

export type PricingTierCode = "STANDARD" | "HIGH_INTENT" | "PREMIUM" | "ENTERPRISE";

export const DEFAULT_TIER_PRICES: Record<Exclude<PricingTierCode, "ENTERPRISE">, number> = {
  STANDARD: 1500,
  HIGH_INTENT: 2000,
  PREMIUM: 2500,
};

export interface PricingRuleLike {
  id: string;
  tier: PricingTierCode;
  patchType?: string | null;
  distributionMode?: string | null;
  priceMinor: number;
  minMinor: number;
  maxMinor: number;
  discountBps: number;
  currency: string;
  priority: number;
  active: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

export interface PriceQuote {
  priceMinor: number;
  currency: string;
  ruleId: string | null;
  basePriceMinor: number;
  discountMinor: number;
  explanation: string;
}

export function selectRule(rules: PricingRuleLike[], tier: PricingTierCode, patchType: string, distributionMode: string, now = new Date()) {
  const live = rules.filter(
    (r) =>
      r.active &&
      r.tier === tier &&
      (!r.patchType || r.patchType === patchType) &&
      (!r.distributionMode || r.distributionMode === distributionMode) &&
      (!r.startsAt || r.startsAt <= now) &&
      (!r.endsAt || r.endsAt > now),
  );
  const specificity = (r: PricingRuleLike) => (r.patchType ? 2 : 0) + (r.distributionMode ? 1 : 0);
  return live.sort((a, b) => b.priority - a.priority || specificity(b) - specificity(a))[0] ?? null;
}

export function priceOpportunity(rules: PricingRuleLike[], tier: PricingTierCode, patchType: string, distributionMode: string, now = new Date()): PriceQuote | null {
  const rule = selectRule(rules, tier, patchType, distributionMode, now);
  if (!rule) {
    if (tier === "ENTERPRISE") return null;
    const base = DEFAULT_TIER_PRICES[tier];
    return { priceMinor: base, currency: "USD", ruleId: null, basePriceMinor: base, discountMinor: 0, explanation: `Default ${tier.toLowerCase().replace("_", " ")} price` };
  }
  const discount = Math.round((rule.priceMinor * Math.max(0, Math.min(rule.discountBps, 10_000))) / 10_000);
  const price = Math.max(rule.minMinor, Math.min(rule.maxMinor, rule.priceMinor - discount));
  return {
    priceMinor: price,
    currency: rule.currency,
    ruleId: rule.id,
    basePriceMinor: rule.priceMinor,
    discountMinor: rule.priceMinor - price,
    explanation: discount ? `Rule “${rule.id.slice(0, 8)}” with ${(rule.discountBps / 100).toFixed(0)}% promotional discount` : `Rule “${rule.id.slice(0, 8)}”`,
  };
}

/** Validates an admin manual override against hard platform limits. */
export function validateManualPrice(priceMinor: number): string | null {
  if (!Number.isInteger(priceMinor) || priceMinor < 100) return "Price must be at least $1.00";
  if (priceMinor > 100_000) return "Price cannot exceed $1,000.00 without engineering review";
  return null;
}
