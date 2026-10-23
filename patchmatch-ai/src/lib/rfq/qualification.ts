/**
 * RFQ QUALIFICATION ENGINE — deterministic, explainable, versioned.
 *
 * Produces completeness, intent and fraud scores, a tier (A–D), a pricing tier,
 * missing fields and clarification questions. AI may add enrichment but never
 * replaces these rules; humans review anything that is not clearly Tier A.
 *
 * Fairness rule: free email providers (gmail, outlook…) and small quantities are
 * NOT negative signals. Only disposable/throwaway domains are.
 */

export const QUALIFICATION_RULES_VERSION = "qual-2026.10.1";

export type Tier = "A" | "B" | "C" | "D";
export type PricingTierCode = "STANDARD" | "HIGH_INTENT" | "PREMIUM" | "ENTERPRISE";

export interface QualificationInput {
  patchType: string;
  quantity: number;
  width?: number | null;
  height?: number | null;
  backing?: string | null;
  borderType?: string | null;
  colorCount?: number | null;
  artworkCount: number;
  destinationCountry?: string | null;
  destinationPostal?: string | null;
  requiredBy?: Date | null;
  budgetTotalMinor?: number | null;
  targetUnitMinor?: number | null;
  budgetUndisclosed: boolean;
  notes?: string | null;
  artworkNotes?: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  contactCompany?: string | null;
  contactWebsite?: string | null;
  emailVerified: boolean;
  /** Other RFQs from the same email in the last 7 days with the same patch type. */
  recentDuplicateCount: number;
  /** RFQs from the same IP in the last 24h. */
  recentSameIpCount: number;
  now?: Date;
}

export interface Signal {
  code: string;
  category: "completeness" | "intent" | "fraud";
  weight: number;
  detail?: string;
}

export interface QualificationResult {
  tier: Tier;
  pricingTier: PricingTierCode;
  score: number;
  completenessScore: number;
  intentScore: number;
  fraudScore: number;
  signals: Signal[];
  missingFields: string[];
  clarificationQuestions: string[];
  needsHumanReview: boolean;
  sellable: boolean;
  isDuplicate: boolean;
  reasons: string[];
}

export const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org", "yopmail.com", "trashmail.com",
  "sharklasers.com", "getnada.com", "dispostable.com", "throwawaymail.com", "maildrop.cc", "fakeinbox.com", "mintemail.com",
]);

const URL_RE = /(https?:\/\/|www\.)\S+/gi;

function looksLikeGibberish(name: string): boolean {
  const s = name.toLowerCase().replace(/[^a-z]/g, "");
  if (s.length < 2) return true;
  if (/(.)\1{3,}/.test(s)) return true;
  if (s.length >= 6 && !/[aeiouy]/.test(s)) return true;
  if (/^(test|asdf|qwer|aaaa|xxx)/.test(s)) return true;
  return false;
}

function digits(s: string | null | undefined) {
  return (s ?? "").replace(/\D/g, "").length;
}

export function qualifyRfq(input: QualificationInput): QualificationResult {
  const now = input.now ?? new Date();
  const signals: Signal[] = [];
  const add = (category: Signal["category"], code: string, weight: number, detail?: string) => signals.push({ category, code, weight, detail });
  const missing: string[] = [];
  const questions: string[] = [];

  // ── Completeness (max 100) ──
  if (input.patchType && input.patchType !== "NOT_SURE") add("completeness", "PATCH_TYPE_KNOWN", 10);
  else {
    add("completeness", "PATCH_TYPE_UNDECIDED", 5);
    questions.push("Do you have a preferred patch style (embroidered, woven, PVC…), or would you like suppliers to recommend one?");
  }
  if (input.quantity > 0) add("completeness", "QUANTITY", 15);
  if (input.width && input.height) add("completeness", "DIMENSIONS", 15);
  else {
    missing.push("dimensions");
    questions.push("What size should the patch be (width × height)?");
  }
  if (input.backing) add("completeness", "BACKING", 10);
  else {
    missing.push("backing");
    questions.push("How will the patch be attached — sew-on, iron-on, hook-and-loop or adhesive?");
  }
  if (input.artworkCount > 0) add("completeness", "ARTWORK", 15);
  else {
    missing.push("artwork");
    questions.push("Can you upload your logo or a sketch? Suppliers can't quote accurately without artwork.");
  }
  if (input.destinationCountry && input.destinationPostal) add("completeness", "DESTINATION", 10);
  else if (input.destinationCountry) {
    add("completeness", "DESTINATION_PARTIAL", 5);
    missing.push("postal code");
  } else missing.push("destination");
  if (input.requiredBy) add("completeness", "DEADLINE", 10);
  else {
    missing.push("deadline");
    questions.push("When do you need the patches delivered?");
  }
  if (input.budgetUndisclosed || input.budgetTotalMinor || input.targetUnitMinor) add("completeness", "BUDGET_ANSWERED", 5);
  if (input.colorCount) add("completeness", "COLOR_COUNT", 5);
  else if (input.patchType !== "SUBLIMATED" && input.patchType !== "PRINTED") missing.push("number of colours");
  if (input.borderType && input.borderType !== "UNSURE") add("completeness", "BORDER", 5);
  const completenessScore = Math.min(100, signals.filter((s) => s.category === "completeness").reduce((a, s) => a + s.weight, 0));

  // ── Intent (max 100) ──
  if (input.emailVerified) add("intent", "EMAIL_VERIFIED", 30);
  if (digits(input.contactPhone) >= 7) add("intent", "PHONE_PROVIDED", 15);
  if (input.contactCompany || input.contactWebsite) add("intent", "BUSINESS_IDENTITY", 15);
  if (input.requiredBy) {
    const days = (input.requiredBy.getTime() - now.getTime()) / 86_400_000;
    if (days > 0 && days <= 120) add("intent", "NEAR_TERM_DEADLINE", 15, `${Math.round(days)} days`);
    else if (days <= 0) {
      add("fraud", "DEADLINE_IN_PAST", 10);
      questions.push("The delivery date you entered has already passed — what is your new target date?");
    }
  }
  if (input.quantity >= 50) add("intent", "VIABLE_QUANTITY", 10);
  if (!input.budgetUndisclosed && (input.budgetTotalMinor || input.targetUnitMinor)) add("intent", "BUDGET_DISCLOSED", 10);
  if (((input.notes ?? "") + (input.artworkNotes ?? "")).trim().length >= 40) add("intent", "DETAILED_NOTES", 5);
  const intentScore = Math.min(100, signals.filter((s) => s.category === "intent").reduce((a, s) => a + s.weight, 0));

  // ── Fraud / quality risk (higher = worse) ──
  const domain = input.contactEmail.split("@")[1]?.toLowerCase() ?? "";
  if (DISPOSABLE_DOMAINS.has(domain)) add("fraud", "DISPOSABLE_EMAIL", 40, domain);
  if (looksLikeGibberish(input.contactName)) add("fraud", "SUSPICIOUS_NAME", 20);
  const text = `${input.notes ?? ""} ${input.artworkNotes ?? ""}`;
  const urlCount = text.match(URL_RE)?.length ?? 0;
  if (urlCount >= 2) add("fraud", "LINK_SPAM", 25, `${urlCount} links in notes`);
  if (input.quantity > 500_000) add("fraud", "IMPLAUSIBLE_QUANTITY", 15);
  if (input.recentSameIpCount > 5) add("fraud", "IP_VELOCITY", 30, `${input.recentSameIpCount} RFQs from this IP in 24h`);
  if (input.contactPhone && digits(input.contactPhone) < 7) add("fraud", "INVALID_PHONE", 10);
  if (input.artworkCount === 0 && text.trim().length < 10) add("fraud", "NO_DESIGN_INFORMATION", 10);
  const isDuplicate = input.recentDuplicateCount > 0;
  if (isDuplicate) add("fraud", "DUPLICATE_SUBMISSION", 30, `${input.recentDuplicateCount} similar RFQ(s) in 7 days`);
  const fraudScore = Math.min(100, signals.filter((s) => s.category === "fraud").reduce((a, s) => a + s.weight, 0));

  // ── Tier ──
  const reasons: string[] = [];
  let tier: Tier;
  if (fraudScore >= 60) {
    tier = "D";
    reasons.push("High fraud/quality risk score");
  } else if (isDuplicate && fraudScore >= 30) {
    tier = "D";
    reasons.push("Duplicate of a recent request");
  } else if (completenessScore >= 75 && intentScore >= 60 && fraudScore < 30) {
    tier = "A";
    reasons.push("Complete specifications with strong buyer intent");
  } else if (completenessScore >= 50 && intentScore >= 40 && fraudScore < 45) {
    tier = "B";
    reasons.push("Legitimate request that needs some clarification");
  } else {
    tier = "C";
    reasons.push(completenessScore < 50 ? "Too few specifications to quote" : "Buyer appears to be researching");
  }
  if (!input.emailVerified) reasons.push("Email not yet verified — not sellable until verified");

  // ── Pricing tier ──
  let pricingTier: PricingTierCode = "STANDARD";
  const bigBudget = (input.budgetTotalMinor ?? 0) >= 250_000;
  if (input.quantity >= 25_000) pricingTier = "ENTERPRISE";
  else if (tier === "A" && (input.quantity >= 1000 || bigBudget)) pricingTier = "PREMIUM";
  else if (tier === "A") pricingTier = "HIGH_INTENT";

  const sellable = (tier === "A" || tier === "B") && input.emailVerified;
  const needsHumanReview = !(tier === "A" && fraudScore < 15 && input.emailVerified);
  const score = Math.max(0, Math.round(completenessScore * 0.5 + intentScore * 0.5 - fraudScore * 0.5));

  return {
    tier, pricingTier, score, completenessScore, intentScore, fraudScore, signals, missingFields: missing,
    clarificationQuestions: questions.slice(0, 5), needsHumanReview, sellable, isDuplicate, reasons,
  };
}

/** Published qualification criteria: only Tier A and B RFQs with a verified email may be sold. */
export function isSellableTier(tier: Tier | null | undefined) {
  return tier === "A" || tier === "B";
}
