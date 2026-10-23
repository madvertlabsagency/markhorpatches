/**
 * Static reference content about patch types and uses. Educational copy only —
 * no prices, delivery guarantees or performance claims are published here.
 */
export type PatchTypeCode = "EMBROIDERED" | "PVC" | "CHENILLE" | "WOVEN" | "SUBLIMATED" | "LEATHER" | "PRINTED" | "NOT_SURE";
export type IntendedUseCode = "CLOTHING_BRAND" | "STREETWEAR" | "HATS" | "UNIFORMS" | "SPORTS_TEAMS" | "CLUBS" | "EVENTS" | "PROMOTIONAL" | "OTHER";
export type BackingCode = "SEW_ON" | "IRON_ON" | "HOOK_AND_LOOP" | "ADHESIVE" | "NONE" | "OTHER";
export type BorderCode = "MERROWED" | "HOT_CUT" | "LASER_CUT" | "NONE" | "UNSURE";

export interface PatchTypeInfo {
  code: PatchTypeCode;
  slug: string;
  name: string;
  short: string;
  description: string;
  howItsMade: string[];
  applications: string[];
  backings: BackingCode[];
  considerations: string[];
  faqs: { q: string; a: string }[];
  /** Palette used by the generated SVG illustration. */
  art: { base: string; accent: string; edge: string; texture: "stitch" | "rubber" | "terry" | "weave" | "dye" | "grain" | "print" };
}

export const PATCH_TYPES: PatchTypeInfo[] = [
  {
    code: "EMBROIDERED",
    slug: "embroidered",
    name: "Embroidered patches",
    short: "Classic raised thread on twill. Durable, tactile, timeless.",
    description:
      "Embroidered patches are stitched with polyester or rayon thread onto a twill base. The raised texture reads as premium on jackets, caps and uniforms, and the format handles bold logos and lettering well.",
    howItsMade: [
      "Artwork is digitized into a stitch file that maps every needle path.",
      "Multi-head embroidery machines stitch the design onto twill.",
      "Edges are finished with a merrowed border, hot cut or laser cut.",
      "Backing (sew-on, iron-on, hook-and-loop or adhesive) is applied last.",
    ],
    applications: ["Brand logos on apparel", "Uniform and workwear insignia", "Hats and caps", "Club and team crests", "Event merchandise"],
    backings: ["SEW_ON", "IRON_ON", "HOOK_AND_LOOP", "ADHESIVE"],
    considerations: [
      "Very fine lines and small text (under ~4 mm) may need simplification.",
      "Stitch coverage (e.g. 50%, 75%, 100%) affects look, weight and cost.",
      "Thread colours are matched to a thread chart rather than exact Pantone values.",
    ],
    faqs: [
      { q: "What is the smallest readable text?", a: "As a rule of thumb, lettering below about 4 mm tall loses definition. Manufacturers will usually advise during quoting." },
      { q: "Can embroidered patches use gradients?", a: "True gradients are difficult in thread. Manufacturers typically approximate them with stepped colours, or suggest sublimated or printed patches." },
    ],
    art: { base: "#1E6B4B", accent: "#F15A24", edge: "#D9B382", texture: "stitch" },
  },
  {
    code: "PVC",
    slug: "pvc",
    name: "PVC patches",
    short: "Moulded soft rubber. Weatherproof with crisp 2D/3D detail.",
    description:
      "PVC patches are moulded from soft polyvinyl chloride poured into a custom mould. They are waterproof, flexible and hold sharp, layered detail — popular for outdoor, tactical and streetwear brands.",
    howItsMade: [
      "A metal or silicone mould is produced from your artwork.",
      "Coloured PVC is dispensed into each mould cavity layer by layer.",
      "The patch is heat-cured, then removed and inspected.",
      "Hook-and-loop or sew channels are added if required.",
    ],
    applications: ["Outdoor and tactical gear", "Bags and backpacks", "Streetwear", "Morale patches", "Promotional items"],
    backings: ["HOOK_AND_LOOP", "SEW_ON", "ADHESIVE", "NONE"],
    considerations: [
      "A mould charge is common, so per-unit cost usually falls with volume.",
      "Each colour is a separate fill — colour count affects complexity.",
      "Raised (3D) layers need clear depth separation in artwork.",
    ],
    faqs: [
      { q: "Are PVC patches waterproof?", a: "PVC itself is water-resistant and does not fray, which is why it is popular for outdoor use." },
      { q: "Can PVC be iron-on?", a: "Generally no — heat can deform PVC. Hook-and-loop, sew-on or adhesive backings are typical." },
    ],
    art: { base: "#0B1F3B", accent: "#F15A24", edge: "#D9B382", texture: "rubber" },
  },
  {
    code: "CHENILLE",
    slug: "chenille",
    name: "Chenille patches",
    short: "Fuzzy, varsity-style loops of yarn on felt.",
    description:
      "Chenille patches use looped yarn stitched onto felt to create a soft, raised, vintage texture associated with varsity letters and collegiate apparel.",
    howItsMade: [
      "Artwork is converted into chenille and embroidery stitch paths.",
      "Yarn loops are stitched onto layered felt.",
      "Felt layers are cut and combined for depth.",
      "Edges and backing are finished.",
    ],
    applications: ["Varsity jackets", "Sports teams", "Schools and clubs", "Streetwear statement pieces"],
    backings: ["SEW_ON", "IRON_ON", "ADHESIVE"],
    considerations: ["Best for larger, bold shapes — fine detail is usually stitched in embroidery around the chenille.", "Usually produced at larger sizes than standard embroidered patches."],
    faqs: [{ q: "Can chenille hold small text?", a: "Small text is normally done with flat embroidery on top of the chenille areas." }],
    art: { base: "#1E6B4B", accent: "#F8F6F1", edge: "#0B1F3B", texture: "terry" },
  },
  {
    code: "WOVEN",
    slug: "woven",
    name: "Woven patches",
    short: "Thin, flat, high-detail thread weave.",
    description:
      "Woven patches are produced on a loom with fine threads, giving a flat profile and much finer detail than embroidery. They suit small text, intricate logos and labels.",
    howItsMade: ["Artwork is mapped to a weave pattern.", "A jacquard loom weaves the design with fine threads.", "Patches are cut and edges finished.", "Backing is applied."],
    applications: ["Fine-detail logos", "Labels and tags", "Uniforms", "Hats"],
    backings: ["SEW_ON", "IRON_ON", "HOOK_AND_LOOP", "ADHESIVE"],
    considerations: ["Colour count is usually limited by the loom.", "Flatter and lighter than embroidered patches."],
    faqs: [{ q: "Woven or embroidered?", a: "Woven is better for fine detail and small text; embroidered gives a raised, textured look." }],
    art: { base: "#0B1F3B", accent: "#D9B382", edge: "#F8F6F1", texture: "weave" },
  },
  {
    code: "SUBLIMATED",
    slug: "sublimated",
    name: "Sublimated patches",
    short: "Full-colour dye transfer — photos and gradients.",
    description:
      "Dye-sublimated patches transfer ink into a polyester base, allowing photographic detail, gradients and unlimited colours, usually finished with an embroidered border.",
    howItsMade: ["Artwork is printed on transfer paper.", "Heat and pressure sublimate the ink into polyester twill.", "A merrowed or cut border is added.", "Backing is applied."],
    applications: ["Photographic designs", "Gradients and complex colour", "Event and promotional runs"],
    backings: ["SEW_ON", "IRON_ON", "HOOK_AND_LOOP", "ADHESIVE"],
    considerations: ["Flat surface, no raised texture.", "High-resolution artwork is important."],
    faqs: [{ q: "Is there a colour limit?", a: "Sublimation is a full-colour process, so colour count is not normally limited." }],
    art: { base: "#F15A24", accent: "#D9B382", edge: "#0B1F3B", texture: "dye" },
  },
  {
    code: "LEATHER",
    slug: "leather",
    name: "Leather patches",
    short: "Debossed or laser-engraved genuine or faux leather.",
    description:
      "Leather patches are debossed, embossed or laser-engraved on genuine or synthetic leather. They are a premium choice for hats, denim and workwear.",
    howItsMade: ["A die or laser file is prepared from artwork.", "Leather is debossed, embossed or engraved.", "Patches are cut to shape.", "Sewing holes or adhesive backing are added."],
    applications: ["Hats and trucker caps", "Denim and workwear", "Bags and accessories"],
    backings: ["SEW_ON", "ADHESIVE", "IRON_ON"],
    considerations: ["Results vary with leather type and colour.", "Usually single-tone; colour fills are possible with some processes."],
    faqs: [{ q: "Genuine or faux leather?", a: "Both are common. Tell suppliers your preference in the RFQ notes." }],
    art: { base: "#8B5A2B", accent: "#F3D9B1", edge: "#5C3A1A", texture: "grain" },
  },
  {
    code: "PRINTED",
    slug: "printed",
    name: "Printed patches",
    short: "Screen or digitally printed — fast and economical.",
    description:
      "Printed patches use screen or digital printing on fabric, a cost-effective option for full-colour designs and shorter runs.",
    howItsMade: ["Artwork is prepared for print.", "Design is printed onto fabric.", "Patches are cut and bordered.", "Backing is applied."],
    applications: ["Promotional giveaways", "Event merchandise", "Full-colour logos"],
    backings: ["SEW_ON", "IRON_ON", "ADHESIVE"],
    considerations: ["Flat finish.", "Durability depends on print method and fabric."],
    faqs: [{ q: "Printed or sublimated?", a: "Both are full colour. Suppliers can explain which suits your fabric, run size and durability needs." }],
    art: { base: "#D2470F", accent: "#F8F6F1", edge: "#0B1F3B", texture: "print" },
  },
];

export const NOT_SURE_INFO = {
  code: "NOT_SURE" as const,
  name: "Not sure yet",
  short: "Describe your idea — our assistant and suppliers will recommend a technique.",
};

export function patchTypeBySlug(slug: string) {
  return PATCH_TYPES.find((p) => p.slug === slug) ?? null;
}

export function patchTypeName(code: string): string {
  return PATCH_TYPES.find((p) => p.code === code)?.name.replace(/ patches$/, "") ?? (code === "NOT_SURE" ? "Not sure" : code);
}

export const INTENDED_USES: { code: IntendedUseCode; label: string; slug?: string; blurb: string }[] = [
  { code: "CLOTHING_BRAND", label: "Clothing brand", slug: "clothing-brands", blurb: "Branded patches for apparel lines and private labels." },
  { code: "STREETWEAR", label: "Streetwear", slug: "streetwear", blurb: "Statement patches, PVC and chenille for drops." },
  { code: "HATS", label: "Hats", slug: "hats", blurb: "Front-panel patches for caps, beanies and truckers." },
  { code: "UNIFORMS", label: "Uniforms", blurb: "Workwear, security, hospitality and service uniforms." },
  { code: "SPORTS_TEAMS", label: "Sports teams", slug: "sports-teams", blurb: "Crests, numbers and varsity patches." },
  { code: "CLUBS", label: "Clubs", slug: "clubs", blurb: "Motorcycle clubs, scouts, societies and associations." },
  { code: "EVENTS", label: "Events", slug: "events", blurb: "Commemorative and limited-run event patches." },
  { code: "PROMOTIONAL", label: "Promotional merchandise", blurb: "Giveaways and marketing merchandise." },
  { code: "OTHER", label: "Other", blurb: "Anything else — tell us more." },
];

export const BACKINGS: { code: BackingCode; label: string; hint: string }[] = [
  { code: "SEW_ON", label: "Sew-on", hint: "Most durable; stitched to the garment." },
  { code: "IRON_ON", label: "Iron-on", hint: "Heat-activated adhesive." },
  { code: "HOOK_AND_LOOP", label: "Hook-and-loop", hint: "Removable (Velcro®-style)." },
  { code: "ADHESIVE", label: "Adhesive", hint: "Peel-and-stick; temporary use." },
  { code: "NONE", label: "No backing", hint: "Plain back." },
  { code: "OTHER", label: "Other", hint: "Describe in notes." },
];

export const BORDERS: { code: BorderCode; label: string }[] = [
  { code: "MERROWED", label: "Merrowed (overlocked)" },
  { code: "HOT_CUT", label: "Hot cut" },
  { code: "LASER_CUT", label: "Laser cut" },
  { code: "NONE", label: "No border" },
  { code: "UNSURE", label: "Not sure" },
];

export const SHAPES = ["Circle", "Square", "Rectangle", "Oval", "Shield", "Custom die-cut"] as const;

export const SPECIAL_FINISHES = ["Metallic thread", "Glow-in-the-dark", "3D puff", "Reflective", "Velvet / flock", "Glitter", "Raised PVC layers"] as const;

export function labelFor<T extends { code: string; label: string }>(list: readonly T[], code: string | null | undefined): string {
  if (!code) return "—";
  return list.find((x) => x.code === code)?.label ?? code;
}

export const COUNTRIES: { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "PK", name: "Pakistan" },
  { code: "IN", name: "India" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "NL", name: "Netherlands" },
  { code: "IE", name: "Ireland" },
  { code: "NZ", name: "New Zealand" },
];

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO",
  "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

export function countryName(code: string | null | undefined) {
  if (!code) return "—";
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}
