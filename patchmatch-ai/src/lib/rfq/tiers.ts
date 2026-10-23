/**
 * RFQ QUALITY TIERS (pure, unit-tested). Determines which unlock price tier an approved RFQ earns.
 *
 *  Standard Verified ($10 pilot)       — genuine (Tier A/B), email verified, sufficient specs, consent recorded.
 *  Contact-Ready ($12.50 pilot)        — Standard + the buyer explicitly re-confirmed quote interest recently.
 *  Premium Production-Ready ($15 pilot)— Contact-Ready + artwork, actionable quantity, delivery date and a
 *                                        near-term buying stage (≤ 30 days).
 *  Enterprise                          — very large volume; priced manually by an admin.
 *
 * None of these tiers implies the buyer will reply or order.
 */
export type PricingTierCode = "STANDARD" | "HIGH_INTENT" | "PREMIUM" | "ENTERPRISE";

export const TIER_LABEL: Record<PricingTierCode, string> = {
  STANDARD: "Standard Verified",
  HIGH_INTENT: "Contact-Ready",
  PREMIUM: "Premium Production-Ready",
  ENTERPRISE: "Enterprise",
};

export const TIER_DESCRIPTION: Record<PricingTierCode, string> = {
  STANDARD: "Genuine request, verified email, enough detail to quote, and the buyer's sharing consent.",
  HIGH_INTENT: "Standard, plus the buyer recently confirmed they still want quotations.",
  PREMIUM: "Contact-Ready, plus artwork, a firm quantity, a delivery date and a buying window within 30 days.",
  ENTERPRISE: "Very large volume — priced individually.",
};

export interface TierInput {
  qualityTier: "A" | "B" | "C" | "D";
  emailVerified: boolean;
  consented: boolean;
  intentStatus: "NOT_CONFIRMED" | "READY_FOR_QUOTES" | "RESEARCHING" | "NO_LONGER_INTERESTED" | "EXPIRED";
  intentConfirmedAt: Date | null;
  artworkCount: number;
  quantity: number;
  requiredBy: Date | null;
  buyingStage: "READY_7_DAYS" | "WITHIN_30_DAYS" | "COMPARING" | "RESEARCHING" | null;
  completenessScore: number;
  now?: Date;
  contactReadyMaxAgeDays?: number;
  enterpriseQuantity?: number;
}

export function pricingTierFor(i: TierInput): { tier: PricingTierCode | null; checks: { label: string; ok: boolean }[] } {
  const now = i.now ?? new Date();
  const maxAge = (i.contactReadyMaxAgeDays ?? 14) * 86_400_000;
  const standard = [
    { label: "Genuine request (quality tier A or B)", ok: i.qualityTier === "A" || i.qualityTier === "B" },
    { label: "Email verified", ok: i.emailVerified },
    { label: "Buyer consent to matching and sharing recorded", ok: i.consented },
    { label: "Enough detail to quote", ok: i.completenessScore >= 50 },
  ];
  const contactReady = [{ label: "Buyer recently confirmed they want quotations", ok: i.intentStatus === "READY_FOR_QUOTES" && !!i.intentConfirmedAt && now.getTime() - i.intentConfirmedAt.getTime() <= maxAge }];
  const premium = [
    { label: "Artwork provided", ok: i.artworkCount > 0 },
    { label: "Actionable quantity", ok: i.quantity >= 25 },
    { label: "Delivery date given", ok: !!i.requiredBy },
    { label: "Buying within 30 days", ok: i.buyingStage === "READY_7_DAYS" || i.buyingStage === "WITHIN_30_DAYS" },
    { label: "Detailed specifications", ok: i.completenessScore >= 75 },
  ];
  const checks = [...standard, ...contactReady, ...premium];
  if (!standard.every((c) => c.ok)) return { tier: null, checks };
  if (i.quantity >= (i.enterpriseQuantity ?? 25_000)) return { tier: "ENTERPRISE", checks };
  if (!contactReady.every((c) => c.ok)) return { tier: "STANDARD", checks };
  if (!premium.every((c) => c.ok)) return { tier: "HIGH_INTENT", checks };
  return { tier: "PREMIUM", checks };
}
