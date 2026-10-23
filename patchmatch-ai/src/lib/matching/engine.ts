/**
 * MATCHING ENGINE — hybrid, explainable.
 *
 * 1. Hard eligibility filters. A seller failing any filter is ineligible and never
 *    receives the protected opportunity. AI cannot override these.
 * 2. Weighted score (0–100) over seven factors. Weights are versioned in
 *    MatchingConfiguration; DEFAULT_WEIGHTS is the launch configuration.
 */

export const MATCHING_ALGORITHM_VERSION = "match-2026.10.1";

export type FactorKey = "capability" | "capacity" | "delivery" | "quality" | "budget" | "responsiveness" | "logistics";

export const DEFAULT_WEIGHTS: Record<FactorKey, number> = {
  capability: 25,
  capacity: 20,
  delivery: 20,
  quality: 15,
  budget: 10,
  responsiveness: 5,
  logistics: 5,
};

export interface MatchRfq {
  patchType: string;
  quantity: number;
  backing?: string | null;
  borderType?: string | null;
  destinationCountry: string;
  requiredBy?: Date | null;
  rush: boolean;
  hasArtwork: boolean;
  budgetTotalMinor?: number | null;
  targetUnitMinor?: number | null;
  budgetUndisclosed: boolean;
}

export interface MatchSellerCapability {
  patchType: string;
  moq: number;
  maxQuantity?: number | null;
  weeklyCapacity?: number | null;
  standardDays: number;
  rushDays?: number | null;
  priceMinMinor?: number | null;
  priceMaxMinor?: number | null;
}

export interface MatchSeller {
  id: string;
  name: string;
  country: string;
  verificationStatus: string;
  availability: string;
  capabilities: MatchSellerCapability[];
  backingOptions: string[];
  borderOptions: string[];
  shippingCountries: string[];
  artworkSupport: boolean;
  rushCapable: boolean;
  minBudgetMinor?: number | null;
  yearsOperating?: number | null;
  portfolioCount: number;
  avgResponseMinutes?: number | null;
  /** Real platform metrics only. null = not enough data. */
  upheldDisputeRate?: number | null;
  quotesSubmitted: number;
  suspended?: boolean;
}

export interface FactorScore {
  weight: number;
  /** 0..1 */
  value: number;
  points: number;
  note: string;
}

export interface MatchResult {
  sellerId: string;
  eligible: boolean;
  ineligibleReasons: string[];
  score: number;
  breakdown: Record<FactorKey, FactorScore>;
  explanation: string;
  capability?: MatchSellerCapability;
  needsRush: boolean;
}

const DOMESTIC_TRANSIT_DAYS = 4;
const INTERNATIONAL_TRANSIT_DAYS = 7;

function daysUntil(d: Date, now: Date) {
  return Math.floor((d.getTime() - now.getTime()) / 86_400_000);
}

function pickCapability(rfq: MatchRfq, seller: MatchSeller): MatchSellerCapability | undefined {
  if (rfq.patchType === "NOT_SURE") {
    // Buyer is undecided — use the seller's most flexible capability (lowest MOQ that fits).
    return [...seller.capabilities].filter((c) => c.moq <= rfq.quantity).sort((a, b) => a.moq - b.moq)[0] ?? seller.capabilities[0];
  }
  return seller.capabilities.find((c) => c.patchType === rfq.patchType);
}

export function evaluateSeller(rfq: MatchRfq, seller: MatchSeller, weights: Record<FactorKey, number> = DEFAULT_WEIGHTS, now = new Date()): MatchResult {
  const reasons: string[] = [];
  const cap = pickCapability(rfq, seller);

  // ── Hard eligibility filters ──
  if (seller.verificationStatus !== "VERIFIED") reasons.push("Seller is not verified");
  if (seller.suspended) reasons.push("Seller account is restricted");
  if (seller.availability !== "ACTIVE") reasons.push("Seller has paused new opportunities");
  if (!cap) reasons.push(`Does not produce ${rfq.patchType.toLowerCase().replace("_", " ")} patches`);
  if (cap && cap.moq > rfq.quantity) reasons.push(`MOQ ${cap.moq} exceeds requested quantity ${rfq.quantity}`);
  if (cap?.maxQuantity && cap.maxQuantity < rfq.quantity) reasons.push(`Quantity exceeds seller maximum of ${cap.maxQuantity}`);
  const domestic = seller.country === rfq.destinationCountry;
  if (!domestic && !seller.shippingCountries.includes(rfq.destinationCountry)) reasons.push(`Does not ship to ${rfq.destinationCountry}`);

  let needsRush = false;
  let slackDays: number | null = null;
  if (cap && rfq.requiredBy) {
    const available = daysUntil(rfq.requiredBy, now);
    const transit = domestic ? DOMESTIC_TRANSIT_DAYS : INTERNATIONAL_TRANSIT_DAYS;
    const standardNeed = cap.standardDays + transit;
    if (available >= standardNeed) slackDays = available - standardNeed;
    else if (seller.rushCapable && cap.rushDays && available >= cap.rushDays + transit) {
      needsRush = true;
      slackDays = available - (cap.rushDays + transit);
    } else reasons.push(`Cannot deliver by the deadline (needs ~${standardNeed} days, ${Math.max(available, 0)} available)`);
  }
  if (cap?.weeklyCapacity && rfq.requiredBy) {
    const weeks = Math.max(1, daysUntil(rfq.requiredBy, now) / 7);
    if (cap.weeklyCapacity * weeks < rfq.quantity) reasons.push("Insufficient production capacity before the deadline");
  }
  if (seller.minBudgetMinor && !rfq.budgetUndisclosed && rfq.budgetTotalMinor && rfq.budgetTotalMinor < seller.minBudgetMinor) {
    reasons.push("Below the seller's minimum project budget");
  }

  // ── Scoring ──
  const f = (key: FactorKey, value: number, note: string): FactorScore => {
    const v = Math.max(0, Math.min(1, value));
    return { weight: weights[key], value: Math.round(v * 100) / 100, points: Math.round(v * weights[key] * 10) / 10, note };
  };

  // Capability: exact type, backing, border, artwork help.
  let capVal = 0;
  const capNotes: string[] = [];
  if (cap) {
    capVal += rfq.patchType === "NOT_SURE" ? 0.45 : 0.6;
    capNotes.push(rfq.patchType === "NOT_SURE" ? "can advise on technique" : "produces this patch type");
    if (!rfq.backing || rfq.backing === "NONE" || rfq.backing === "OTHER" || seller.backingOptions.includes(rfq.backing)) {
      capVal += 0.2;
      if (rfq.backing && seller.backingOptions.includes(rfq.backing)) capNotes.push("offers requested backing");
    }
    if (!rfq.borderType || rfq.borderType === "UNSURE" || rfq.borderType === "NONE" || seller.borderOptions.includes(rfq.borderType)) capVal += 0.1;
    if (seller.artworkSupport || rfq.hasArtwork) capVal += 0.1;
    if (rfq.patchType === "NOT_SURE" && seller.capabilities.length >= 3) capVal += 0.15;
  }

  // Capacity: MOQ headroom + capacity headroom.
  let capacityVal = 0.5;
  if (cap) {
    const moqRatio = rfq.quantity / Math.max(cap.moq, 1);
    capacityVal = moqRatio >= 2 ? 0.6 : moqRatio >= 1 ? 0.45 : 0;
    if (cap.weeklyCapacity) capacityVal += Math.min(0.4, (cap.weeklyCapacity / Math.max(rfq.quantity, 1)) * 0.2);
    else capacityVal += 0.2;
  }

  // Delivery: slack days before the deadline.
  let deliveryVal = 0.6;
  let deliveryNote = "no deadline given";
  if (slackDays !== null) {
    deliveryVal = needsRush ? 0.5 : Math.min(1, 0.6 + slackDays / 30);
    deliveryNote = needsRush ? "feasible with rush production" : `${slackDays} days of slack`;
  } else if (cap && !rfq.requiredBy) {
    deliveryVal = cap.standardDays <= 14 ? 0.75 : 0.6;
  }

  // Quality: only verified facts + real platform history; new sellers get a neutral score.
  let qualityVal = 0.5;
  const qNotes: string[] = [];
  if ((seller.yearsOperating ?? 0) >= 5) {
    qualityVal += 0.15;
    qNotes.push(`${seller.yearsOperating} years operating`);
  }
  if (seller.portfolioCount >= 3) {
    qualityVal += 0.15;
    qNotes.push("portfolio on file");
  }
  if (seller.upheldDisputeRate !== null && seller.upheldDisputeRate !== undefined && seller.quotesSubmitted >= 5) {
    qualityVal += seller.upheldDisputeRate < 0.05 ? 0.2 : seller.upheldDisputeRate < 0.15 ? 0 : -0.3;
  }

  // Budget compatibility.
  let budgetVal = 0.6;
  let budgetNote = "budget not disclosed";
  const targetUnit = rfq.targetUnitMinor ?? (rfq.budgetTotalMinor && rfq.quantity ? Math.round(rfq.budgetTotalMinor / rfq.quantity) : null);
  if (!rfq.budgetUndisclosed && targetUnit && cap?.priceMinMinor) {
    if (targetUnit >= cap.priceMinMinor) {
      budgetVal = 1;
      budgetNote = "budget within seller's typical range";
    } else {
      budgetVal = Math.max(0, targetUnit / cap.priceMinMinor - 0.2);
      budgetNote = "budget below seller's typical range";
    }
  }

  // Responsiveness (real data only).
  const rmin = seller.avgResponseMinutes;
  const respVal = rmin == null ? 0.5 : rmin <= 60 ? 1 : rmin <= 240 ? 0.75 : rmin <= 1440 ? 0.5 : 0.2;

  // Logistics.
  const logVal = domestic ? 1 : seller.shippingCountries.includes(rfq.destinationCountry) ? 0.7 : 0;

  const breakdown: Record<FactorKey, FactorScore> = {
    capability: f("capability", capVal, capNotes.join(", ") || "no matching capability"),
    capacity: f("capacity", capacityVal, cap ? `MOQ ${cap.moq}${cap.weeklyCapacity ? `, ~${cap.weeklyCapacity}/week` : ""}` : "—"),
    delivery: f("delivery", deliveryVal, deliveryNote),
    quality: f("quality", qualityVal, qNotes.join(", ") || "limited history (neutral)"),
    budget: f("budget", budgetVal, budgetNote),
    responsiveness: f("responsiveness", respVal, rmin == null ? "no response history yet" : `avg ${rmin} min`),
    logistics: f("logistics", logVal, domestic ? "domestic supplier" : "international shipping"),
  };
  const total = Object.values(weights).reduce((a, b) => a + b, 0) || 100;
  const raw = Object.values(breakdown).reduce((a, x) => a + x.points, 0);
  const score = reasons.length ? 0 : Math.round((raw / total) * 100);

  const top = (Object.entries(breakdown) as [FactorKey, FactorScore][])
    .sort((a, b) => b[1].points - a[1].points)
    .slice(0, 3)
    .map(([k, v]) => `${k} (${v.note})`);
  const explanation = reasons.length
    ? `Ineligible: ${reasons.join("; ")}.`
    : `${seller.name} scores ${score}/100. Strongest factors: ${top.join("; ")}.${needsRush ? " Requires rush production." : ""}`;

  return { sellerId: seller.id, eligible: reasons.length === 0, ineligibleReasons: reasons, score, breakdown, explanation, capability: cap, needsRush };
}

export function rankSellers(rfq: MatchRfq, sellers: MatchSeller[], weights: Record<FactorKey, number> = DEFAULT_WEIGHTS, now = new Date()): MatchResult[] {
  return sellers
    .map((s) => evaluateSeller(rfq, s, weights, now))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || a.sellerId.localeCompare(b.sellerId));
}

export function normalizeWeights(input: Partial<Record<FactorKey, number>>): Record<FactorKey, number> {
  const w = { ...DEFAULT_WEIGHTS, ...input };
  for (const k of Object.keys(w) as FactorKey[]) w[k] = Math.max(0, Math.round(Number(w[k]) || 0));
  return w;
}
