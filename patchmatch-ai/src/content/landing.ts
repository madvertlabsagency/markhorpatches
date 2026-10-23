import type { PatchTypeCode } from "@/lib/catalog";

/**
 * Use-case and campaign landing pages. Educational copy only — no prices, testimonials,
 * delivery guarantees or claims about the size of the supplier network.
 */
export interface LandingContent {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  eyebrow: string;
  heroArt: PatchTypeCode;
  presetType?: PatchTypeCode;
  intro: string;
  recommended: { type: PatchTypeCode; why: string }[];
  considerations: string[];
  faqs: { q: string; a: string }[];
}

export const USE_CASES: LandingContent[] = [
  {
    slug: "clothing-brands",
    title: "Custom patches for clothing brands",
    metaTitle: "Custom Patches for Clothing Brands",
    description: "Source branded patches for apparel lines from verified manufacturers. Compare itemised quotes for embroidered, woven, PVC and leather patches.",
    eyebrow: "Apparel brands",
    heroArt: "WOVEN",
    intro: "A patch is often the most visible brand touchpoint on a garment. Describe your spec once, and verified manufacturers who produce for apparel brands can quote.",
    recommended: [
      { type: "WOVEN", why: "Fine detail and small type for labels and logos." },
      { type: "EMBROIDERED", why: "Raised, premium texture for chest and sleeve logos." },
      { type: "LEATHER", why: "Heritage look for denim and outerwear." },
    ],
    considerations: ["Wash durability — ask about backing and edge finishing for frequent laundering.", "Colour consistency across re-orders — share Pantone references.", "Sampling before bulk production for new collections."],
    faqs: [
      { q: "Can I order small runs for a capsule drop?", a: "Yes. Tell us your quantity — we only match manufacturers whose minimum order fits." },
      { q: "Can manufacturers match brand colours?", a: "Share Pantone references in your artwork notes. Thread and dye matching varies by technique; manufacturers will confirm." },
    ],
  },
  {
    slug: "streetwear",
    title: "Custom patches for streetwear",
    metaTitle: "Custom Streetwear Patches",
    description: "Chenille, PVC and embroidered patches for streetwear drops, from verified manufacturers.",
    eyebrow: "Streetwear",
    heroArt: "PVC",
    intro: "Statement pieces need constructions that hold up: thick chenille, layered PVC and dense embroidery. Get quotes from manufacturers who do this every day.",
    recommended: [
      { type: "CHENILLE", why: "Bold varsity texture for oversized placements." },
      { type: "PVC", why: "Crisp, weatherproof 3D detail for bags and outerwear." },
      { type: "EMBROIDERED", why: "Dense stitch coverage with metallic or puff finishes." },
    ],
    considerations: ["Drop timelines — give a firm delivery date so only feasible manufacturers are matched.", "Special finishes (glow, metallic, 3D puff) affect cost and lead time.", "Limited runs may carry higher per-unit setup costs."],
    faqs: [{ q: "Are special finishes available?", a: "Many manufacturers offer metallic thread, glow-in-the-dark and 3D puff. Select them in the request so matching accounts for it." }],
  },
  {
    slug: "sports-teams",
    title: "Custom patches for sports teams",
    metaTitle: "Custom Sports Team Patches",
    description: "Team crests, chenille letters and numbers from verified patch manufacturers.",
    eyebrow: "Sports teams",
    heroArt: "CHENILLE",
    intro: "From youth leagues to varsity programs — crests, letters and championship patches, quoted by manufacturers who can meet your season deadline.",
    recommended: [
      { type: "CHENILLE", why: "Classic letterman and varsity look." },
      { type: "EMBROIDERED", why: "Durable crests for jerseys and jackets." },
      { type: "SUBLIMATED", why: "Full-colour mascots and photographic designs." },
    ],
    considerations: ["Season deadlines — set a delivery date with buffer.", "Size variations for different garments.", "Re-orders for new players each season."],
    faqs: [{ q: "Can I order different sizes in one request?", a: "Describe the variations in your notes; manufacturers will quote each size." }],
  },
  {
    slug: "hats",
    title: "Custom hat patches",
    metaTitle: "Custom Hat Patches",
    description: "Leather, woven, embroidered and PVC patches sized for caps and beanies.",
    eyebrow: "Hats & caps",
    heroArt: "LEATHER",
    intro: "Front-panel patches have tight size and curvature limits. Share your cap style and patch size, and manufacturers that produce hat patches will quote.",
    recommended: [
      { type: "LEATHER", why: "Popular on trucker and heritage caps." },
      { type: "WOVEN", why: "Thin and flexible for curved panels." },
      { type: "PVC", why: "Durable outdoor and performance caps." },
    ],
    considerations: ["Typical front-panel sizes are roughly 2–3.5 in wide.", "Thinner patches conform better to curved crowns.", "Heat-applied backings depend on the cap fabric."],
    faqs: [{ q: "Which backing is best for hats?", a: "Sew-on is the most durable; heat-seal works on many fabrics. Manufacturers will advise based on your cap." }],
  },
  {
    slug: "clubs",
    title: "Custom patches for clubs",
    metaTitle: "Custom Club Patches",
    description: "Patches for motorcycle clubs, scouts, societies and associations from verified manufacturers.",
    eyebrow: "Clubs & associations",
    heroArt: "EMBROIDERED",
    intro: "Rockers, centre patches, merit badges and member insignia — describe your set and get quotes from manufacturers experienced with club orders.",
    recommended: [
      { type: "EMBROIDERED", why: "Traditional, durable insignia." },
      { type: "WOVEN", why: "Fine lettering on small badges." },
      { type: "PVC", why: "Weatherproof patches for gear." },
    ],
    considerations: ["Multi-piece sets (rockers + centre) should be described together.", "Consistent colours across members' patches.", "Re-orders as membership grows."],
    faqs: [{ q: "Can I order a set of different designs?", a: "Yes — upload each design and describe quantities per design in your notes." }],
  },
  {
    slug: "events",
    title: "Custom patches for events",
    metaTitle: "Custom Event Patches",
    description: "Commemorative and limited-run event patches with deadline-aware manufacturer matching.",
    eyebrow: "Events",
    heroArt: "SUBLIMATED",
    intro: "Event dates don't move. We only match manufacturers whose stated production and shipping times fit your delivery date.",
    recommended: [
      { type: "SUBLIMATED", why: "Full-colour artwork with fast production." },
      { type: "PRINTED", why: "Economical for giveaways." },
      { type: "EMBROIDERED", why: "Keepsake quality for commemoratives." },
    ],
    considerations: ["Set a delivery date at least a week before the event.", "Consider rush options for tight timelines.", "Giveaway patches often suit adhesive or iron-on backings."],
    faqs: [{ q: "What if my event is soon?", a: "Mark the request as rush. If no manufacturer can meet the date, we'll tell you rather than match one that can't." }],
  },
];

export const CAMPAIGN_PAGES: Record<string, LandingContent> = {
  "bulk-custom-patches": {
    slug: "bulk-custom-patches",
    title: "Bulk custom patches",
    metaTitle: "Bulk Custom Patches — Quotes From Verified Manufacturers",
    description: "Large-volume custom patch orders matched with manufacturers that have the capacity to deliver.",
    eyebrow: "High-volume orders",
    heroArt: "EMBROIDERED",
    intro: "For large runs, capacity matters as much as price. Our matching checks each manufacturer's stated maximum order size and weekly capacity against your quantity and deadline.",
    recommended: [
      { type: "EMBROIDERED", why: "Scales efficiently on multi-head machines." },
      { type: "WOVEN", why: "Cost-effective at volume for fine detail." },
      { type: "PVC", why: "Mould costs amortise across large runs." },
    ],
    considerations: ["Ask for tiered pricing (e.g. 5,000 / 10,000 / 25,000).", "Request a pre-production sample.", "Clarify packaging and split shipments."],
    faqs: [{ q: "How do you know a manufacturer can handle my volume?", a: "Manufacturers declare maximum quantities and weekly capacity per patch type. Requests that exceed them aren't matched. These are self-declared figures reviewed during verification." }],
  },
  "rush-custom-patches": {
    slug: "rush-custom-patches",
    title: "Rush custom patches",
    metaTitle: "Rush Custom Patches — Deadline-Aware Matching",
    description: "Need patches fast? We match only manufacturers whose stated rush lead times fit your delivery date.",
    eyebrow: "Tight deadlines",
    heroArt: "PRINTED",
    presetType: "NOT_SURE",
    intro: "Tell us the date you need patches in hand. Matching accounts for each manufacturer's rush production time plus shipping, and we won't match anyone who can't plausibly meet it.",
    recommended: [
      { type: "PRINTED", why: "Typically the fastest construction." },
      { type: "SUBLIMATED", why: "No digitising; quick turnarounds." },
      { type: "EMBROIDERED", why: "Many manufacturers offer rush slots." },
    ],
    considerations: ["Lead times are manufacturer estimates, not guarantees.", "Approve proofs quickly to protect your date.", "Expedited shipping may be required."],
    faqs: [{ q: "Do you guarantee delivery dates?", a: "No. We match using manufacturers' stated lead times; confirm timing in their quotes before ordering." }],
  },
};
