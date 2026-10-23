import { z } from "zod";

/**
 * RFQ wizard schema — shared by the client wizard (fast feedback) and the server (authoritative).
 * Each step validates its own slice so the wizard can block "Next" on invalid input.
 */
export const PATCH_TYPE_VALUES = ["EMBROIDERED", "PVC", "CHENILLE", "WOVEN", "SUBLIMATED", "LEATHER", "PRINTED", "NOT_SURE"] as const;
export const INTENDED_USE_VALUES = ["CLOTHING_BRAND", "STREETWEAR", "HATS", "UNIFORMS", "SPORTS_TEAMS", "CLUBS", "EVENTS", "PROMOTIONAL", "OTHER"] as const;
export const BACKING_VALUES = ["SEW_ON", "IRON_ON", "HOOK_AND_LOOP", "ADHESIVE", "NONE", "OTHER"] as const;
export const BORDER_VALUES = ["MERROWED", "HOT_CUT", "LASER_CUT", "NONE", "UNSURE"] as const;

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal("").transform(() => undefined));
const optionalNumber = (schema: z.ZodNumber) => z.preprocess((v) => (v === "" || v === null || v === undefined || Number.isNaN(v) ? undefined : Number(v)), schema.optional());

export const stepPatchType = z.object({ patchType: z.enum(PATCH_TYPE_VALUES, { message: "Choose a patch type (or “Not sure”)." }) });

export const stepUse = z.object({
  intendedUse: z.enum(INTENDED_USE_VALUES, { message: "Choose how the patches will be used." }),
  intendedUseOther: optionalText(120),
});

export const stepDimensions = z.object({
  width: optionalNumber(z.number().positive("Width must be positive").max(60, "That is larger than we support")),
  height: optionalNumber(z.number().positive("Height must be positive").max(60, "That is larger than we support")),
  unit: z.enum(["IN", "CM", "MM"]).default("IN"),
  shape: optionalText(40),
  borderType: z.enum(BORDER_VALUES).optional(),
  material: optionalText(80),
  thickness: optionalText(40),
});

export const stepQuantity = z
  .object({
    quantity: z.preprocess((v) => Number(v), z.number({ message: "Enter an estimated quantity" }).int("Whole numbers only").min(1, "Enter at least 1").max(1_000_000, "Contact us for volumes above 1,000,000")),
    minQuantity: optionalNumber(z.number().int().min(1).max(1_000_000)),
    repeatPotential: z.boolean().default(false),
    sampleRequired: z.boolean().default(false),
  })
  .refine((d) => !d.minQuantity || d.minQuantity <= d.quantity, { message: "Minimum acceptable quantity can't exceed the estimate", path: ["minQuantity"] });

export const stepBacking = z.object({
  backing: z.enum(BACKING_VALUES).optional(),
  backingOther: optionalText(80),
  colorCount: optionalNumber(z.number().int().min(1).max(30)),
  specialFinishing: z.array(z.string().max(40)).max(10).default([]),
});

export const stepArtwork = z.object({
  artworkIds: z.array(z.string().uuid()).max(10, "Up to 10 files").default([]),
  artworkNotes: optionalText(2000),
});

export const stepShipping = z.object({
  destinationCountry: z.string().length(2, "Choose a country"),
  destinationState: optionalText(60),
  destinationPostal: optionalText(16),
  requiredBy: z.preprocess((v) => (v ? v : undefined), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date").optional()),
  rush: z.boolean().default(false),
  sampleBeforeProduction: z.boolean().default(false),
});

export const stepBudget = z.object({
  budgetUndisclosed: z.boolean().default(false),
  budgetTotal: optionalNumber(z.number().min(0).max(10_000_000)),
  targetUnit: optionalNumber(z.number().min(0).max(100_000)),
  budgetFlexibility: z.enum(["FIRM", "SOMEWHAT_FLEXIBLE", "FLEXIBLE"]).optional(),
});

export const stepContact = z.object({
  contactName: z.string().trim().min(2, "Enter your full name").max(120),
  contactCompany: optionalText(160),
  contactEmail: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  contactPhone: optionalText(32).refine((v) => !v || /^[+()\-\s\d.]{7,32}$/.test(v), "Enter a valid phone number"),
  contactWebsite: optionalText(200).refine((v) => !v || /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v), "Enter a valid website"),
  preferredContact: z.enum(["EMAIL", "PHONE", "WHATSAPP", "PLATFORM"]).default("EMAIL"),
});

export const stepConsent = z.object({
  consentMatching: z.literal(true, { message: "You must agree to supplier matching to submit an RFQ." }),
  consentSharing: z.literal(true, { message: "You must agree to how your RFQ information is shared." }),
  disclosureMode: z.enum(["FULL_CONTACT", "PLATFORM_MESSAGING_ONLY"]).default("FULL_CONTACT"),
  consentTerms: z.literal(true, { message: "Please accept the Buyer Terms." }),
  consentMarketing: z.boolean().default(false),
  /** Honeypot — must stay empty. */
  website2: z.string().max(0).optional().or(z.literal("")),
});

export const rfqSubmissionSchema = stepPatchType
  .and(stepUse)
  .and(stepDimensions)
  .and(stepQuantity)
  .and(stepBacking)
  .and(stepArtwork)
  .and(stepShipping)
  .and(stepBudget)
  .and(stepContact)
  .and(stepConsent);

export type RfqSubmission = z.infer<typeof rfqSubmissionSchema>;

export const WIZARD_STEPS = [
  { key: "type", title: "Patch type", schema: stepPatchType },
  { key: "use", title: "Intended use", schema: stepUse },
  { key: "size", title: "Dimensions", schema: stepDimensions },
  { key: "quantity", title: "Quantity", schema: stepQuantity },
  { key: "backing", title: "Backing & construction", schema: stepBacking },
  { key: "artwork", title: "Artwork", schema: stepArtwork },
  { key: "shipping", title: "Timeline & shipping", schema: stepShipping },
  { key: "budget", title: "Budget", schema: stepBudget },
  { key: "contact", title: "Contact details", schema: stepContact },
  { key: "review", title: "Review & consent", schema: stepConsent },
] as const;

/** Consent text is versioned; the hash of the exact text is stored with every consent record. */
export const CONSENT_VERSION = "2026-10-v1";
export const CONSENT_TEXT = {
  SUPPLIER_MATCHING:
    "I ask PatchMatch AI to review my request and match it with verified manufacturers that appear able to fulfil it. Matching is assisted by automated systems and reviewed by people.",
  DATA_SHARING_FULL:
    "Before purchase, manufacturers see only an anonymised summary (no name, email, phone, exact address or identifying artwork detail). If a verified manufacturer purchases access, PatchMatch AI may share my name, company, email, phone, website and full artwork with that manufacturer so they can quote. My details will be shared with no more than {max} manufacturer(s) for this request.",
  DATA_SHARING_PLATFORM:
    "Before purchase, manufacturers see only an anonymised summary. If a verified manufacturer purchases access, they receive my full specifications and artwork and can contact me through PatchMatch AI messaging only — my email and phone are not shared. My request will be shared with no more than {max} manufacturer(s).",
  TERMS: "I agree to the Buyer Terms and Privacy Policy.",
  MARKETING: "Send me occasional tips and offers from PatchMatch AI. (Optional — you can unsubscribe at any time.)",
} as const;

export function sharingText(mode: "FULL_CONTACT" | "PLATFORM_MESSAGING_ONLY", max: number) {
  return (mode === "FULL_CONTACT" ? CONSENT_TEXT.DATA_SHARING_FULL : CONSENT_TEXT.DATA_SHARING_PLATFORM).replace("{max}", String(max));
}
