export interface Industry {
  slug: string;
  name: string;
  headline: string;
  accent: string;
  intro: string;
  uses: string[];
  recommended: { code: string; why: string }[];
  tips: string[];
  seoTitle: string;
  seoDescription: string;
}

export const INDUSTRIES: Industry[] = [
  {
    slug: "streetwear", name: "Streetwear", headline: "Patches that drop hard.", accent: "Limited runs welcome.",
    intro: "Streetwear lives on detail. Chenille letters, 3D puff logos and woven labels give your drop texture people want to touch — and the transparent pricing makes small, limited runs easy to plan.",
    uses: ["Hoodies and crewnecks", "Varsity and work jackets", "Caps and beanies", "Woven neck and hem labels"],
    recommended: [{ code: "CHENILLE", why: "Statement texture for chest and back hits" }, { code: "PUFF_3D", why: "Raised logos that pop on caps" }, { code: "WOVEN", why: "Clean inside labels and small tags" }],
    tips: ["Order patches for future colorways in one run to unlock better per-patch pricing.", "Ask for individual packaging if patches are sold separately."],
    seoTitle: "Custom Patches for Streetwear Brands | Patch Gorilla", seoDescription: "Chenille, 3D puff and woven custom patches for streetwear drops. Free proof, transparent pricing, U.S. delivery.",
  },
  {
    slug: "apparel-brands", name: "Apparel Brands", headline: "Your label, levelled up.", accent: "Retail-ready.",
    intro: "From woven labels to leather hat patches, the right patch makes a garment feel finished. We match your brand colors on the proof so every piece in the line looks consistent.",
    uses: ["Leather hat patches", "Woven brand labels", "Embroidered chest logos", "Retail merch and add-ons"],
    recommended: [{ code: "LEATHER", why: "Premium look for hats and denim" }, { code: "WOVEN", why: "Fine detail for labels" }, { code: "EMBROIDERED", why: "Classic, versatile brand logos" }],
    tips: ["Share Pantone references for the closest color match.", "Reorders are one click from your account."],
    seoTitle: "Custom Patches & Labels for Apparel Brands | Patch Gorilla", seoDescription: "Leather, woven and embroidered patches for apparel brands. Brand-accurate proofs and transparent pricing.",
  },
  {
    slug: "businesses", name: "Businesses", headline: "Uniforms that mean business.", accent: "Look the part.",
    intro: "Branded uniforms build trust before anyone says a word. Embroidered and woven patches hold up to daily wear and industrial washing, and Velcro backings make swaps easy.",
    uses: ["Work shirts and jackets", "Name and role patches", "Safety and hi-vis gear", "Corporate gifts"],
    recommended: [{ code: "EMBROIDERED", why: "Durable through daily wear" }, { code: "PVC", why: "Weatherproof for outdoor crews" }, { code: "WOVEN", why: "Small logos with fine detail" }],
    tips: ["Choose sew-on backing for uniforms that see industrial laundering.", "Hook & loop lets staff swap name patches."],
    seoTitle: "Custom Uniform Patches for Businesses | Patch Gorilla", seoDescription: "Durable embroidered, woven and PVC patches for business uniforms and workwear. Free proof before production.",
  },
  {
    slug: "sports-teams", name: "Sports Teams", headline: "Wear the crest.", accent: "Game day ready.",
    intro: "Team patches celebrate seasons, championships and the people who made them happen. Chenille letters, embroidered crests and commemorative patches — built to last beyond the final whistle.",
    uses: ["Letterman jackets", "Championship patches", "Jerseys and warmups", "Fan merch"],
    recommended: [{ code: "CHENILLE", why: "Classic varsity letters" }, { code: "EMBROIDERED", why: "Team crests and logos" }, { code: "PVC", why: "Bag and gear tags" }],
    tips: ["Plan championship patches early — rush is available but costs more.", "Use the same design across sizes for jackets and caps."],
    seoTitle: "Custom Team Patches & Varsity Letters | Patch Gorilla", seoDescription: "Custom sports team patches, chenille varsity letters and championship patches. Free proof and U.S. delivery.",
  },
  {
    slug: "clubs", name: "Clubs", headline: "Badges of belonging.", accent: "Earn the patch.",
    intro: "Motorcycle clubs, hiking groups, run crews — patches mark membership and milestones. We reproduce your club colors precisely and keep your designs saved for future members.",
    uses: ["Member patches", "Event and milestone patches", "Rockers and back pieces", "Vest and jacket patches"],
    recommended: [{ code: "EMBROIDERED", why: "Traditional club look" }, { code: "WOVEN", why: "Detailed emblems" }, { code: "PVC", why: "Outdoor and adventure gear" }],
    tips: ["Order a few extra for new members to keep pricing consistent.", "Large back patches are quoted by average size — check the size guide."],
    seoTitle: "Custom Club Patches | Patch Gorilla", seoDescription: "Custom patches for clubs and groups — member, rocker and milestone patches with free proofs.",
  },
  {
    slug: "schools", name: "Schools", headline: "School spirit, stitched.", accent: "Class of forever.",
    intro: "From varsity letters to uniform crests and club badges, patches help students carry their school with pride. We make ordering simple for administrators and booster clubs alike.",
    uses: ["Varsity letters", "Uniform crests", "Club and award patches", "Graduation keepsakes"],
    recommended: [{ code: "CHENILLE", why: "Varsity letters and mascots" }, { code: "EMBROIDERED", why: "Uniform crests" }, { code: "WOVEN", why: "Detailed award patches" }],
    tips: ["Request a quote for school purchase orders through support.", "Add individual packaging for award distribution."],
    seoTitle: "Custom School Patches & Varsity Letters | Patch Gorilla", seoDescription: "Custom chenille varsity letters, uniform crests and award patches for schools.",
  },
  {
    slug: "events", name: "Events", headline: "Souvenirs people keep.", accent: "Way better than a lanyard.",
    intro: "Conferences, festivals, races and reunions — a custom patch is the giveaway people actually keep. Peel & stick backings make them instant; printed patches handle full-color artwork.",
    uses: ["Festival and race souvenirs", "Conference swag", "Commemorative patches", "Staff and crew IDs"],
    recommended: [{ code: "PRINTED", why: "Full-color art at great value" }, { code: "EMBROIDERED", why: "Classic keepsakes" }, { code: "PVC", why: "Durable bag tags" }],
    tips: ["Tell us your event date — we'll confirm the timeline on your proof.", "Peel & stick is great for on-site application."],
    seoTitle: "Custom Event Patches & Giveaways | Patch Gorilla", seoDescription: "Custom event patches for festivals, races and conferences. Fast proofs and tracked U.S. delivery.",
  },
  {
    slug: "creators", name: "Creators", headline: "Merch your fans will flex.", accent: "From sketch to drop.",
    intro: "Turn your art, mascot or catchphrase into merch fans love. Not production-ready? Send a sketch — free artwork support handles the rest.",
    uses: ["Fan merch", "Patreon and membership rewards", "Collab drops", "Packaging inserts"],
    recommended: [{ code: "EMBROIDERED", why: "Classic merch patches" }, { code: "PRINTED", why: "Detailed illustrations" }, { code: "PVC", why: "Collectible, durable patches" }],
    tips: ["Order in tiers — start small, reorder the winners.", "Ask about glow-in-the-dark thread for limited editions."],
    seoTitle: "Custom Patches for Creators & Merch | Patch Gorilla", seoDescription: "Custom merch patches for creators, artists and streamers. Free artwork support and proofs.",
  },
];

export function getIndustry(slug: string) {
  return INDUSTRIES.find((i) => i.slug === slug) ?? null;
}
