/** Admin-editable site settings. Typed + validated; defaults used when a key is missing. */
import { z } from "zod";

export const settingsSchemas = {
  brand: z.object({
    supportEmail: z.string().email().or(z.literal("")),
    whatsappNumber: z.string().regex(/^\d{0,15}$/, "Digits only, international format (e.g. 15551234567)"),
    phoneDisplay: z.string(),
    businessHours: z.string(),
    socials: z.object({ instagram: z.string(), facebook: z.string(), linkedin: z.string(), tiktok: z.string() }),
  }),
  promises: z.object({
    mockup24HourPromise: z.boolean(),
    guaranteeHeadline: z.string().min(3),
    guaranteeBody: z.string().min(3),
    guaranteeTagline: z.string(),
    manufacturingStatement: z.string(),
  }),
  trustMetrics: z.object({
    enabled: z.boolean(),
    items: z.array(z.object({ value: z.string(), label: z.string() })).max(4),
  }),
  uploads: z.object({ maxUploadMb: z.number().int().min(1).max(200) }),
  shipping: z.object({
    standardCents: z.number().int().min(0),
    freeThresholdCents: z.number().int().min(0),
    standardTransitMin: z.number().int().min(0),
    standardTransitMax: z.number().int().min(0),
    expeditedCents: z.number().int().min(0),
    expeditedTransitMin: z.number().int().min(0),
    expeditedTransitMax: z.number().int().min(0),
  }),
  tax: z.object({
    mode: z.enum(["none", "flat_by_state", "stripe"]),
    ratesBps: z.record(z.string(), z.number().int().min(0).max(2000)),
    taxShipping: z.boolean(),
  }),
  home: z.object({
    videoUrl: z.string(),
    videoPosterUrl: z.string(),
    videoTitle: z.string(),
    videoDescription: z.string(),
  }),
  payments: z.object({
    displayedMethods: z.array(z.enum(["visa", "mastercard", "amex", "discover", "apple_pay", "google_pay"])),
  }),
};

export type SettingsKey = keyof typeof settingsSchemas;
export type Settings = { [K in SettingsKey]: z.infer<(typeof settingsSchemas)[K]> };

export const DEFAULT_SETTINGS: Settings = {
  brand: {
    supportEmail: "",
    whatsappNumber: "",
    phoneDisplay: "",
    businessHours: "Mon–Fri, 9am–6pm ET",
    socials: { instagram: "", facebook: "", linkedin: "", tiktok: "" },
  },
  promises: {
    mockup24HourPromise: false,
    guaranteeHeadline: "THE MARKHOR QUALITY PROMISE.",
    guaranteeBody:
      "If we manufacture something differently from the production specification you approved, we'll make it right.",
    guaranteeTagline: "OUR MISTAKE. OUR COST.",
    manufacturingStatement:
      "Produced by our specialist production partners and delivered to customers across the United States.",
  },
  trustMetrics: { enabled: false, items: [] },
  uploads: { maxUploadMb: 50 },
  shipping: {
    standardCents: 995,
    freeThresholdCents: 15000,
    standardTransitMin: 3,
    standardTransitMax: 5,
    expeditedCents: 2995,
    expeditedTransitMin: 1,
    expeditedTransitMax: 2,
  },
  tax: { mode: "none", ratesBps: {}, taxShipping: false },
  home: {
    videoUrl: "",
    videoPosterUrl: "/placeholders/macro-patches.webp",
    videoTitle: "From artwork to something you can wear.",
    videoDescription: "A closer look at how your artwork becomes a patch you can hold.",
  },
  payments: { displayedMethods: [] },
};
