/**
 * Seed catalog. ALL PRICES ARE DEMO / PLACEHOLDER MARKET PRICES.
 * Demo market pricing — verify production economics before launch.
 * Edit live prices in /admin/pricing (no deploy needed).
 */
import type { Shape } from "../src/generated/prisma/enums";

const ALL_SHAPES: Shape[] = ["CIRCLE", "SQUARE", "RECTANGLE", "SHIELD", "OVAL", "CUSTOM"];

export const SIZE_TIERS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 8, 10, 12];
export const QUANTITY_TIERS = [10, 25, 50, 100, 200, 300, 500, 1000, 2500, 5000];

/** Size multiplier relative to the 3" anchor price. */
const SIZE_FACTOR: Record<number, number> = {
  1: 0.62, 1.5: 0.68, 2: 0.76, 2.5: 0.88, 3: 1, 3.5: 1.14, 4: 1.3, 4.5: 1.46, 5: 1.62, 6: 2.0, 8: 2.75, 10: 3.6, 12: 4.6,
};

/** 3-inch anchor prices supplied in the brief (dollars per patch). */
const ANCHOR_3IN: Record<string, Record<number, number>> = {
  EMBROIDERED: { 50: 4.25, 100: 2.95, 200: 2.15, 300: 1.85, 500: 1.45, 1000: 1.1 },
  WOVEN: { 50: 4.0, 100: 2.6, 200: 1.85, 300: 1.55, 500: 1.25, 1000: 0.95 },
  PVC: { 50: 6.25, 100: 4.25, 200: 3.0, 300: 2.5, 500: 1.85, 1000: 1.45 },
  LEATHER: { 50: 5.75, 100: 4.6, 200: 3.95, 300: 3.35, 500: 2.65, 1000: 1.95 },
  CHENILLE: { 50: 5.75, 100: 3.75, 200: 2.25, 300: 1.75, 500: 1.4, 1000: 1.15 },
};

function extend(anchor: Record<number, number>): Record<number, number> {
  return {
    10: anchor[50] * 2.35,
    25: anchor[50] * 1.5,
    ...anchor,
    2500: anchor[1000] * 0.86,
    5000: anchor[1000] * 0.76,
  };
}

function derived(from: Record<number, number>, factor: number) {
  return Object.fromEntries(Object.entries(from).map(([q, p]) => [q, p * factor])) as Record<number, number>;
}

const ladders: Record<string, Record<number, number>> = {
  EMBROIDERED: extend(ANCHOR_3IN.EMBROIDERED),
  WOVEN: extend(ANCHOR_3IN.WOVEN),
  PVC: extend(ANCHOR_3IN.PVC),
  LEATHER: extend(ANCHOR_3IN.LEATHER),
  CHENILLE: extend(ANCHOR_3IN.CHENILLE),
};
ladders.PRINTED = derived(ladders.WOVEN, 0.92);
ladders.PUFF_3D = derived(ladders.EMBROIDERED, 1.25);

/** Unit price in cents for a patch type at a size tier and quantity tier. 3" anchors are exact. */
export function seedPriceCents(code: string, sizeMax: number, qty: number): number {
  const base = ladders[code][qty];
  const exactAnchor = sizeMax === 3 && ANCHOR_3IN[code]?.[qty] !== undefined;
  if (exactAnchor) return Math.round(base * 100);
  const cents = base * SIZE_FACTOR[sizeMax] * 100;
  return Math.max(35, Math.round(cents / 5) * 5);
}

export const BACKINGS = [
  { code: "NONE", name: "No Backing", description: "Clean, unbacked finish — ideal if you'll stitch it on yourself.", modifierType: "PER_UNIT", modifierValue: 0, imageUrl: "/options/backing-none.svg" },
  { code: "SEW_ON", name: "Sew-On", description: "Reinforced back built for neat, durable stitching. The most permanent option.", modifierType: "PER_UNIT", modifierValue: 0, imageUrl: "/options/backing-sew.svg" },
  { code: "IRON_ON", name: "Iron-On", description: "Heat-activated adhesive. Press on with a household iron or heat press.", modifierType: "PER_UNIT", modifierValue: 15, imageUrl: "/options/backing-iron.svg" },
  { code: "VELCRO_HOOK", name: "Velcro Hook", description: "Hook side only — attaches to existing loop panels on gear and uniforms.", modifierType: "PER_UNIT", modifierValue: 45, imageUrl: "/options/backing-hook.svg" },
  { code: "HOOK_LOOP", name: "Hook & Loop", description: "Both hook and loop sides supplied so patches are swappable.", modifierType: "PER_UNIT", modifierValue: 65, imageUrl: "/options/backing-hookloop.svg" },
  { code: "PEEL_STICK", name: "Peel & Stick", description: "Adhesive backing for temporary use, events and giveaways.", modifierType: "PER_UNIT", modifierValue: 20, imageUrl: "/options/backing-peel.svg" },
] as const;

export const BORDERS = [
  { code: "MERROWED", name: "Merrowed", description: "Classic overlocked thread edge. Durable and traditional for simple shapes.", modifierType: "PER_UNIT", modifierValue: 0, allowedShapes: ["CIRCLE", "SQUARE", "RECTANGLE", "SHIELD", "OVAL"] as Shape[], imageUrl: "/options/border-merrow.svg" },
  { code: "HEAT_CUT", name: "Heat Cut", description: "Sealed hot-knife edge that follows any outline — great for custom shapes.", modifierType: "PER_UNIT", modifierValue: 0, allowedShapes: [] as Shape[], imageUrl: "/options/border-heat.svg" },
  { code: "LASER_CUT", name: "Laser Cut", description: "Precision-cut edge for intricate outlines and crisp leather shapes.", modifierType: "PER_UNIT", modifierValue: 10, allowedShapes: [] as Shape[], imageUrl: "/options/border-laser.svg" },
] as const;

export const EXTRAS = [
  { code: "METALLIC_THREAD", name: "Metallic Thread", description: "Gold, silver or color metallic thread for a premium shine.", modifierType: "PER_UNIT", modifierValue: 25, isRush: false },
  { code: "NEON_THREAD", name: "Neon Thread", description: "High-visibility fluorescent thread colors.", modifierType: "PER_UNIT", modifierValue: 15, isRush: false },
  { code: "GLOW_THREAD", name: "Glow-in-the-Dark", description: "Glows after exposure to light. A crowd favorite for events.", modifierType: "PER_UNIT", modifierValue: 35, isRush: false },
  { code: "EFFECT_3D", name: "3D Effect", description: "Raised, dimensional elements that add depth to selected areas.", modifierType: "PER_UNIT", modifierValue: 40, isRush: false },
  { code: "INDIVIDUAL_PACKAGING", name: "Individual Packaging", description: "Each patch in its own clear bag — retail and merch ready.", modifierType: "PER_UNIT", modifierValue: 15, isRush: false },
  { code: "RUSH", name: "Rush Production", description: "Moves your order to the front of the production queue.", modifierType: "PERCENT", modifierValue: 2500, isRush: true },
] as const;

type Code = "EMBROIDERED" | "WOVEN" | "PVC" | "CHENILLE" | "LEATHER" | "PRINTED" | "PUFF_3D";

export const PATCH_TYPES: {
  code: Code;
  slug: string;
  name: string;
  shortName: string;
  shortDescription: string;
  bestUse: string;
  minSizeIn: number;
  maxSizeIn: number;
  minQuantity: number;
  productionDays: number;
  rushProductionDays: number;
  allowedShapes: Shape[];
  backings: string[];
  borders: string[];
  extras: string[];
}[] = [
  {
    code: "EMBROIDERED", slug: "embroidered-patches", name: "Embroidered Patches", shortName: "Embroidered",
    shortDescription: "Classic raised thread with real texture and depth.", bestUse: "Logos, uniforms, hats and merch",
    minSizeIn: 1, maxSizeIn: 12, minQuantity: 10, productionDays: 10, rushProductionDays: 6, allowedShapes: ALL_SHAPES,
    backings: ["NONE", "SEW_ON", "IRON_ON", "VELCRO_HOOK", "HOOK_LOOP", "PEEL_STICK"], borders: ["MERROWED", "HEAT_CUT", "LASER_CUT"],
    extras: ["METALLIC_THREAD", "NEON_THREAD", "GLOW_THREAD", "EFFECT_3D", "INDIVIDUAL_PACKAGING", "RUSH"],
  },
  {
    code: "WOVEN", slug: "woven-patches", name: "Woven Patches", shortName: "Woven",
    shortDescription: "Fine thread for crisp detail and small text.", bestUse: "Detailed logos, labels and small lettering",
    minSizeIn: 1, maxSizeIn: 10, minQuantity: 10, productionDays: 10, rushProductionDays: 6, allowedShapes: ALL_SHAPES,
    backings: ["NONE", "SEW_ON", "IRON_ON", "VELCRO_HOOK", "HOOK_LOOP", "PEEL_STICK"], borders: ["MERROWED", "HEAT_CUT", "LASER_CUT"],
    extras: ["METALLIC_THREAD", "NEON_THREAD", "INDIVIDUAL_PACKAGING", "RUSH"],
  },
  {
    code: "PVC", slug: "pvc-patches", name: "PVC Patches", shortName: "PVC",
    shortDescription: "Soft rubber that's waterproof and built tough.", bestUse: "Outdoor gear, tactical and bags",
    minSizeIn: 1.5, maxSizeIn: 8, minQuantity: 50, productionDays: 14, rushProductionDays: 9, allowedShapes: ALL_SHAPES,
    backings: ["NONE", "SEW_ON", "VELCRO_HOOK", "HOOK_LOOP", "PEEL_STICK"], borders: [],
    extras: ["GLOW_THREAD", "EFFECT_3D", "INDIVIDUAL_PACKAGING", "RUSH"],
  },
  {
    code: "CHENILLE", slug: "chenille-patches", name: "Chenille Patches", shortName: "Chenille",
    shortDescription: "Fuzzy, varsity-style texture that begs to be touched.", bestUse: "Letterman jackets, schools and streetwear",
    minSizeIn: 2.5, maxSizeIn: 12, minQuantity: 25, productionDays: 14, rushProductionDays: 9, allowedShapes: ALL_SHAPES,
    backings: ["NONE", "SEW_ON", "IRON_ON", "HOOK_LOOP"], borders: ["MERROWED", "HEAT_CUT"],
    extras: ["INDIVIDUAL_PACKAGING", "RUSH"],
  },
  {
    code: "LEATHER", slug: "leather-patches", name: "Leather Patches", shortName: "Leather",
    shortDescription: "Debossed or laser-engraved for a premium label.", bestUse: "Hats, denim and premium apparel",
    minSizeIn: 1.5, maxSizeIn: 6, minQuantity: 25, productionDays: 12, rushProductionDays: 7, allowedShapes: ALL_SHAPES,
    backings: ["NONE", "SEW_ON", "VELCRO_HOOK", "HOOK_LOOP", "PEEL_STICK"], borders: ["LASER_CUT"],
    extras: ["INDIVIDUAL_PACKAGING", "RUSH"],
  },
  {
    code: "PRINTED", slug: "printed-patches", name: "Printed Patches", shortName: "Printed",
    shortDescription: "Full-color dye-sublimation for photos and gradients.", bestUse: "Photos, gradients and full-color art",
    minSizeIn: 1, maxSizeIn: 10, minQuantity: 10, productionDays: 8, rushProductionDays: 5, allowedShapes: ALL_SHAPES,
    backings: ["NONE", "SEW_ON", "IRON_ON", "VELCRO_HOOK", "HOOK_LOOP", "PEEL_STICK"], borders: ["MERROWED", "HEAT_CUT", "LASER_CUT"],
    extras: ["INDIVIDUAL_PACKAGING", "RUSH"],
  },
  {
    code: "PUFF_3D", slug: "3d-puff-patches", name: "3D Puff Patches", shortName: "3D Puff",
    shortDescription: "Foam-raised embroidery that stands out — literally.", bestUse: "Hats, bold logos and streetwear",
    minSizeIn: 1.5, maxSizeIn: 8, minQuantity: 25, productionDays: 12, rushProductionDays: 7, allowedShapes: ALL_SHAPES,
    backings: ["NONE", "SEW_ON", "IRON_ON", "VELCRO_HOOK", "HOOK_LOOP", "PEEL_STICK"], borders: ["MERROWED", "HEAT_CUT"],
    extras: ["METALLIC_THREAD", "NEON_THREAD", "GLOW_THREAD", "INDIVIDUAL_PACKAGING", "RUSH"],
  },
];

export const PRODUCTS: {
  slug: string;
  patchTypeCode: Code | null;
  name: string;
  h1: string;
  tagline: string;
  shortDescription: string;
  description: string;
  bestFor: string[];
  canReproduce: string[];
  highlights: string[];
  seoTitle: string;
  seoDescription: string;
}[] = [
  {
    slug: "custom-patches", patchTypeCode: null, name: "Custom Patches", h1: "Custom Patches for Bold Brands",
    tagline: "Don’t follow the herd.",
    shortDescription: "Embroidered, woven, PVC, chenille, leather, printed and 3D puff patches — built around your artwork.",
    description: "Every Markhor Patches order starts with your artwork and ends with a patch you're proud to put your name on. Pick a style, upload your design and get a free digital proof before anything is produced.",
    bestFor: ["Apparel and streetwear brands", "Teams and clubs", "Businesses and uniforms", "Events and creators"],
    canReproduce: ["Logos and wordmarks", "Illustrations", "Photos (printed)", "Gradients (printed / woven)"],
    highlights: ["Free artwork support", "Digital proof before production", "Transparent pricing", "Tracked shipping"],
    seoTitle: "Custom Patches — Embroidered, PVC, Woven & More | Markhor Patches",
    seoDescription: "Design custom patches online with transparent pricing and a free digital proof. Embroidered, PVC, woven, chenille, leather, printed and 3D puff patches shipped across the U.S.",
  },
  {
    slug: "embroidered-patches", patchTypeCode: "EMBROIDERED", name: "Embroidered Patches", h1: "Custom Embroidered Patches",
    tagline: "Real thread. Real texture.",
    shortDescription: "The classic patch: raised thread, rich color and a texture you can feel.",
    description: "Embroidered patches are stitched with polyester thread on a twill base, giving your design a raised, tactile finish. They're the most versatile patch we make — tough enough for workwear, sharp enough for retail.",
    bestFor: ["Hats and jackets", "Work uniforms", "Brand merch", "Clubs and teams"],
    canReproduce: ["Bold logos and shapes", "Text from about 1/4\" tall", "Up to 12 thread colors", "Metallic, neon and glow threads"],
    highlights: ["Most popular style", "Up to 100% embroidery coverage", "Merrowed, heat-cut or laser-cut edges"],
    seoTitle: "Custom Embroidered Patches — No Minimum Hassle | Markhor Patches",
    seoDescription: "Order custom embroidered patches with a free digital proof. Iron-on, sew-on, Velcro and more. Transparent per-patch pricing and tracked U.S. shipping.",
  },
  {
    slug: "woven-patches", patchTypeCode: "WOVEN", name: "Woven Patches", h1: "Custom Woven Patches",
    tagline: "Detail that embroidery can't hold.",
    shortDescription: "Thinner thread, tighter weave — perfect for fine detail and small lettering.",
    description: "Woven patches use fine threads woven together (rather than stitched on top), so they capture small text and intricate detail with a flat, smooth finish. Ideal when your logo has thin lines.",
    bestFor: ["Detailed logos", "Small lettering", "Clothing labels", "Lightweight apparel"],
    canReproduce: ["Fine lines and small text", "Detailed illustrations", "Subtle color transitions", "Flat, smooth surfaces"],
    highlights: ["Sharper detail than embroidery", "Thin and flexible", "Great for labels"],
    seoTitle: "Custom Woven Patches — Fine Detail, Flat Finish | Markhor Patches",
    seoDescription: "Custom woven patches for detailed logos and small text. Free proof, transparent pricing and fast, tracked U.S. shipping.",
  },
  {
    slug: "pvc-patches", patchTypeCode: "PVC", name: "PVC Patches", h1: "Custom PVC Patches",
    tagline: "Built for the elements.",
    shortDescription: "Soft, flexible rubber patches that are waterproof, durable and dimensional.",
    description: "PVC patches are molded from soft rubber, layer by layer, for bold colors and dimensional detail. They shrug off water, mud and sun — making them the go-to for outdoor brands and gear.",
    bestFor: ["Outdoor and tactical gear", "Bags and backpacks", "Rain gear", "Pet products"],
    canReproduce: ["Bold, solid color areas", "2D and 3D layered detail", "Glow-in-the-dark elements", "Custom shapes"],
    highlights: ["Waterproof", "Weather and UV resistant", "Easy to clean"],
    seoTitle: "Custom PVC Patches — Waterproof & Durable | Markhor Patches",
    seoDescription: "Custom PVC rubber patches for outdoor gear, bags and tactical use. Velcro-ready, free digital proof and transparent pricing.",
  },
  {
    slug: "chenille-patches", patchTypeCode: "CHENILLE", name: "Chenille Patches", h1: "Custom Chenille Patches",
    tagline: "Varsity energy.",
    shortDescription: "Fuzzy yarn loops on a felt base — the iconic letterman texture.",
    description: "Chenille patches are made from looped yarn on felt, creating a soft, plush, three-dimensional surface. They're the signature of varsity jackets and an instant upgrade for streetwear.",
    bestFor: ["Letterman jackets", "Schools and athletics", "Streetwear drops", "Hoodies and totes"],
    canReproduce: ["Large letters and numbers", "Bold, simple shapes", "Felt layering", "Embroidered accents"],
    highlights: ["Iconic varsity texture", "Big, bold presence", "Layered felt"],
    seoTitle: "Custom Chenille Patches — Varsity Style | Markhor Patches",
    seoDescription: "Custom chenille patches for letterman jackets, schools and streetwear. Free digital proof and transparent pricing.",
  },
  {
    slug: "leather-patches", patchTypeCode: "LEATHER", name: "Leather Patches", h1: "Custom Leather Patches",
    tagline: "The premium label.",
    shortDescription: "Debossed, embossed or laser-engraved patches with a premium feel.",
    description: "Leather patches give your product a crafted, premium finish. Your logo is debossed or laser-engraved into the surface for a subtle, high-end look that ages beautifully.",
    bestFor: ["Hats", "Denim and jackets", "Bags and accessories", "Premium merch"],
    canReproduce: ["Logos and wordmarks", "Line art", "Simple illustrations", "Precise outlines"],
    highlights: ["Premium look", "Laser-cut edges", "Genuine or synthetic options"],
    seoTitle: "Custom Leather Patches for Hats & Apparel | Markhor Patches",
    seoDescription: "Custom leather patches for hats, denim and premium apparel. Debossed or laser-engraved. Free proof and transparent pricing.",
  },
  {
    slug: "printed-patches", patchTypeCode: "PRINTED", name: "Printed Patches", h1: "Custom Printed Patches",
    tagline: "Every color. Every gradient.",
    shortDescription: "Full-color dye-sublimation — photos, gradients and unlimited colors.",
    description: "Printed patches use dye-sublimation to reproduce your artwork in full color on a smooth fabric surface. When your design has photos, gradients or more colors than thread can handle, print it.",
    bestFor: ["Photo-realistic artwork", "Gradients and shading", "Event giveaways", "Budget-friendly runs"],
    canReproduce: ["Photographs", "Gradients", "Unlimited colors", "Fine detail"],
    highlights: ["Unlimited colors", "Fastest production", "Great value"],
    seoTitle: "Custom Printed Patches — Full Color | Markhor Patches",
    seoDescription: "Full-color custom printed patches for photos and gradients. Free proof, transparent pricing and tracked U.S. shipping.",
  },
  {
    slug: "3d-puff-patches", patchTypeCode: "PUFF_3D", name: "3D Puff Patches", h1: "Custom 3D Puff Patches",
    tagline: "Raised. Bold. Unmissable.",
    shortDescription: "Foam under the stitching lifts your design off the surface.",
    description: "3D puff patches add a foam layer beneath the embroidery, so your logo rises off the patch with bold, rounded dimension. They're especially popular on hats and streetwear.",
    bestFor: ["Hats", "Streetwear", "Bold logos and lettering", "Merch drops"],
    canReproduce: ["Bold lettering", "Thick shapes", "Mixed flat + raised areas", "Metallic and neon threads"],
    highlights: ["Dramatic raised effect", "Hat favorite", "Mix flat and puff"],
    seoTitle: "Custom 3D Puff Patches for Hats & Streetwear | Markhor Patches",
    seoDescription: "Custom 3D puff embroidered patches with raised foam lettering. Free digital proof, transparent pricing and tracked U.S. shipping.",
  },
];
