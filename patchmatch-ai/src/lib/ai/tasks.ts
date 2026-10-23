import "server-only";
import { z, type AITask } from "@/lib/services/ai";
import { PATCH_TYPES, patchTypeName, labelFor, BACKINGS } from "@/lib/catalog";

/**
 * Versioned AI tasks. Inputs are deliberately minimal: no buyer names, emails, phones or
 * raw artwork are ever sent to an AI provider. Each task has a deterministic fallback so the
 * product works identically (if less eloquently) with AI_PROVIDER=rules.
 */

// ───────────── RFQ enrichment (parse requirements, suggest techniques, find gaps) ─────────────

export interface RfqEnrichInput {
  patchType: string;
  intendedUse: string;
  quantity: number;
  width?: number | null;
  height?: number | null;
  unit: string;
  backing?: string | null;
  colorCount?: number | null;
  specialFinishing: string[];
  rush: boolean;
  destinationCountry: string;
  notes?: string | null; // already redacted of contact info
  artworkNotes?: string | null; // already redacted
  artwork: ArtworkStats[];
  missingFields: string[];
}

const enrichSchema = z.object({
  summary: z.string().max(600),
  suggestedTechniques: z.array(z.object({ patchType: z.enum(["EMBROIDERED", "PVC", "CHENILLE", "WOVEN", "SUBLIMATED", "LEATHER", "PRINTED"]), reason: z.string().max(240) })).max(3),
  missingSpecifications: z.array(z.string().max(120)).max(8),
  clarificationQuestions: z.array(z.string().max(240)).max(5),
  artworkConsiderations: z.string().max(500),
  confidence: z.number().min(0).max(1),
});
export type RfqEnrichment = z.infer<typeof enrichSchema>;

function suggestByRules(i: RfqEnrichInput): RfqEnrichment["suggestedTechniques"] {
  const out: RfqEnrichment["suggestedTechniques"] = [];
  const text = `${i.notes ?? ""} ${i.artworkNotes ?? ""}`.toLowerCase();
  const manyColors = (i.colorCount ?? 0) > 9 || i.artwork.some((a) => a.colorComplexity === "high");
  if (/photo|gradient|realistic|full colou?r/.test(text) || manyColors) out.push({ patchType: "SUBLIMATED", reason: "Many colours or gradients reproduce best with dye-sublimation." });
  if (/waterproof|outdoor|tactical|rubber|3d/.test(text) || i.intendedUse === "STREETWEAR") out.push({ patchType: "PVC", reason: "Durable, weatherproof and good for raised 3D detail." });
  if (/varsity|letterman|fuzzy|chenille/.test(text) || i.intendedUse === "SPORTS_TEAMS") out.push({ patchType: "CHENILLE", reason: "Classic varsity texture for teams and letterman jackets." });
  if (/small text|fine detail|label/.test(text)) out.push({ patchType: "WOVEN", reason: "Woven patches hold fine detail and small lettering." });
  if (i.intendedUse === "HATS" && !out.length) out.push({ patchType: "LEATHER", reason: "Leather and embroidered patches are popular on hats." });
  if (!out.some((o) => o.patchType === "EMBROIDERED")) out.push({ patchType: "EMBROIDERED", reason: "Versatile, durable default for logos on apparel." });
  return out.slice(0, 3);
}

export const rfqEnrichTask: AITask<RfqEnrichInput, RfqEnrichment> = {
  feature: "rfq_enrichment",
  promptVersion: "rfq-enrich-v1",
  schema: enrichSchema,
  effort: "low",
  minConfidence: 0.4,
  system:
    "You are a custom-patch manufacturing expert helping a sourcing marketplace prepare buyer requests for manufacturers. " +
    "Be factual and concise. Never state prices, production costs or delivery guarantees. Do not invent requirements the buyer did not give. " +
    "Write the summary in neutral third person without any personal or company names.",
  buildPrompt: (i) =>
    `Buyer request (anonymised):\n${JSON.stringify(i, null, 2)}\n\nReturn: a 1–3 sentence manufacturer-facing summary; up to 3 suitable patch techniques with reasons ` +
    `(only if the buyer is unsure or another technique is clearly better); missing specifications a manufacturer needs to quote; up to 5 polite clarification questions; ` +
    `artwork considerations based on the artwork statistics; and your confidence 0–1.`,
  fallback: (i) => {
    const size = i.width && i.height ? `${i.width}×${i.height} ${i.unit.toLowerCase()}` : "size not specified";
    const backing = i.backing ? labelFor(BACKINGS, i.backing).toLowerCase() : "unspecified backing";
    const art = i.artwork.length ? `${i.artwork.length} artwork file(s) provided` : "no artwork yet";
    return {
      summary: `${i.quantity.toLocaleString("en-US")} × ${patchTypeName(i.patchType).toLowerCase()} patches (${size}, ${backing}) for ${i.intendedUse.toLowerCase().replace(/_/g, " ")}, shipping to ${i.destinationCountry}${i.rush ? ", rush requested" : ""}. ${art}.`,
      suggestedTechniques: i.patchType === "NOT_SURE" ? suggestByRules(i) : [],
      missingSpecifications: i.missingFields,
      clarificationQuestions: [],
      artworkConsiderations: describeArtwork(i.artwork),
      confidence: 0.6,
    };
  },
};

// ───────────── Artwork analysis (from privacy-preserving statistics, never the image) ─────────────

export interface ArtworkStats {
  type: string; // png/jpg/pdf/svg
  widthPx?: number;
  heightPx?: number;
  hasTransparency?: boolean;
  distinctColorsEstimate?: number;
  colorComplexity?: "low" | "medium" | "high";
}

export function describeArtwork(stats: ArtworkStats[]): string {
  if (!stats.length) return "No artwork uploaded — manufacturers will need a logo, sketch or reference image.";
  const notes: string[] = [];
  for (const s of stats) {
    if (s.type === "pdf" || s.type === "svg") notes.push(`${s.type.toUpperCase()} file — likely vector or print-ready, which helps digitising.`);
    else {
      if ((s.widthPx ?? 0) < 600 || (s.heightPx ?? 0) < 600) notes.push(`Low-resolution ${s.type.toUpperCase()} (${s.widthPx}×${s.heightPx}px) — a higher-resolution or vector file may be requested.`);
      if (s.colorComplexity === "high") notes.push("Many colours or gradients detected — embroidery may need simplification; sublimation or printing reproduces gradients better.");
      else if (s.colorComplexity === "low") notes.push(`Simple palette (~${s.distinctColorsEstimate} colours) — well suited to embroidery, woven or PVC.`);
      if (s.hasTransparency) notes.push("Transparent background present — the outline shape is clear.");
    }
  }
  return [...new Set(notes)].join(" ") + " (Automated estimate — it does not determine production cost.)";
}

// ───────────── Buyer concierge (patch education) ─────────────

const conciergeSchema = z.object({
  answer: z.string().max(1500),
  recommendedPatchType: z.enum(["EMBROIDERED", "PVC", "CHENILLE", "WOVEN", "SUBLIMATED", "LEATHER", "PRINTED", "NONE"]),
  confidence: z.number().min(0).max(1),
});
export type ConciergeAnswer = z.infer<typeof conciergeSchema>;

export const conciergeTask: AITask<{ question: string }, ConciergeAnswer> = {
  feature: "buyer_concierge",
  promptVersion: "concierge-v1",
  schema: conciergeSchema,
  effort: "low",
  system:
    "You are PatchMatch AI's patch concierge. Explain custom patch types, materials, backings and production processes in plain English (US buyers). " +
    "Never quote prices, lead times as guarantees, or claim to place orders. If asked about anything unrelated to custom patches or the sourcing process, politely decline. " +
    `Reference knowledge: ${PATCH_TYPES.map((p) => `${p.name}: ${p.short}`).join(" | ")}`,
  buildPrompt: (i) => `Buyer question: ${i.question.slice(0, 800)}`,
  fallback: ({ question }) => {
    const q = question.toLowerCase();
    const hit = PATCH_TYPES.find((p) => q.includes(p.slug) || q.includes(p.code.toLowerCase()));
    if (/iron|sew|velcro|hook|backing|adhesive/.test(q)) {
      return { answer: BACKINGS.filter((b) => b.code !== "OTHER").map((b) => `${b.label}: ${b.hint}`).join(" "), recommendedPatchType: "NONE", confidence: 0.7 };
    }
    if (/differen|vs|versus|compare|which/.test(q) || !hit) {
      const rec = suggestByRules({ patchType: "NOT_SURE", intendedUse: "OTHER", quantity: 100, unit: "IN", specialFinishing: [], rush: false, destinationCountry: "US", notes: question, artwork: [], missingFields: [] })[0];
      return {
        answer: `Quick guide: ${PATCH_TYPES.slice(0, 5).map((p) => `${p.name.replace(" patches", "")} — ${p.short}`).join(" ")} Tell us about your design and use, and verified manufacturers will advise in their quotes.`,
        recommendedPatchType: rec.patchType,
        confidence: 0.5,
      };
    }
    return { answer: `${hit.description} Common uses: ${hit.applications.join(", ")}. Things to know: ${hit.considerations.join(" ")}`, recommendedPatchType: hit.code as ConciergeAnswer["recommendedPatchType"], confidence: 0.7 };
  },
};

// ───────────── Seller copilot (helps write accurate responses; never prices) ─────────────

const copilotSchema = z.object({
  coverMessage: z.string().max(1500),
  checklist: z.array(z.string().max(200)).max(10),
  warnings: z.array(z.string().max(240)).max(6),
  confidence: z.number().min(0).max(1),
});
export type CopilotDraft = z.infer<typeof copilotSchema>;

export interface CopilotInput {
  sellerName: string;
  patchType: string;
  quantity: number;
  size: string;
  backing: string;
  requiredBy: string | null;
  rush: boolean;
  sellerStandardDays: number | null;
  sellerMoq: number | null;
  missingFields: string[];
  sellerNotes?: string;
}

export const sellerCopilotTask: AITask<CopilotInput, CopilotDraft> = {
  feature: "seller_copilot",
  promptVersion: "copilot-v1",
  schema: copilotSchema,
  effort: "low",
  system:
    "You help verified patch manufacturers write accurate, professional responses to buyer RFQs. Never invent prices, fees, discounts, certifications or lead times — " +
    "leave placeholders like [unit price] for the seller to fill. Point out anything the seller should confirm before quoting.",
  buildPrompt: (i) => `RFQ and seller context:\n${JSON.stringify(i, null, 2)}\nDraft a short cover message, a pre-quote checklist, and warnings (e.g. deadline risk, MOQ).`,
  fallback: (i) => {
    const warnings: string[] = [];
    if (i.sellerMoq && i.quantity < i.sellerMoq) warnings.push(`Requested quantity (${i.quantity}) is below your MOQ (${i.sellerMoq}).`);
    if (i.rush) warnings.push("Buyer requested rush production — confirm you can meet it before committing.");
    if (i.requiredBy && i.sellerStandardDays) warnings.push(`Check your ${i.sellerStandardDays}-day standard lead time plus shipping against the ${i.requiredBy} deadline.`);
    return {
      coverMessage:
        `Hello, thank you for your request for ${i.quantity.toLocaleString("en-US")} ${patchTypeName(i.patchType).toLowerCase()} patches (${i.size}, ${i.backing}). ` +
        `We have reviewed your specifications and artwork. Our quotation is attached: [unit price] per patch, [setup/tooling fees], production in [X] days after artwork approval, ` +
        `and shipping by [method] in about [Y] days. We will send a digital proof before production. — ${i.sellerName}`,
      checklist: ["Confirm size and colour count against the artwork", "Confirm backing and border", "Include setup / mould / sample fees separately", "State production time and shipping estimate", "State payment terms and revision policy", ...i.missingFields.map((f) => `Ask the buyer about: ${f}`)].slice(0, 10),
      warnings,
      confidence: 0.6,
    };
  },
};

// ───────────── Match explanation (wording only — never changes eligibility or score) ─────────────

const explainSchema = z.object({ explanation: z.string().max(600), confidence: z.number().min(0).max(1) });

export const matchExplainTask: AITask<{ sellerLabel: string; score: number; factors: Record<string, { points: number; weight: number; note: string }>; needsRush: boolean; fallbackText: string }, z.infer<typeof explainSchema>> = {
  feature: "match_explanation",
  promptVersion: "match-explain-v1",
  schema: explainSchema,
  effort: "low",
  system: "Explain a deterministic supplier-match score to a marketplace operator in 1–2 plain sentences. Do not change or second-guess the score.",
  buildPrompt: (i) => JSON.stringify({ seller: i.sellerLabel, score: i.score, factors: i.factors, needsRush: i.needsRush }),
  fallback: (i) => ({ explanation: i.fallbackText, confidence: 1 }),
};
