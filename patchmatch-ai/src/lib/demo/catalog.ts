/**
 * Fictional demo marketplace content (demo databases only). Company names, people and figures
 * are invented for product demonstrations; every record created from this file has isDemo=true.
 */
export const DEMO_PATCH_TYPES = ["EMBROIDERED", "PVC", "CHENILLE", "WOVEN", "SUBLIMATED", "LEATHER", "PRINTED"] as const;
export type DemoPatchType = (typeof DEMO_PATCH_TYPES)[number];
export const DEMO_USES = ["CLOTHING_BRAND", "STREETWEAR", "HATS", "UNIFORMS", "SPORTS_TEAMS", "CLUBS", "EVENTS", "PROMOTIONAL"] as const;
export const DEMO_BACKINGS = ["SEW_ON", "IRON_ON", "HOOK_AND_LOOP", "ADHESIVE"] as const;

export const SELLER_MARKETS = {
  PK: {
    weight: 45,
    prefixes: ["Sialkot", "Crescent", "Indus", "Ravi", "Margalla", "Chenab", "Falcon", "Royal Crest", "Al-Noor", "Khyber", "Punjab", "Zamzam", "Shalimar", "Hamza", "Noor", "Shaheen", "Karakoram", "Hunza", "Markhor", "Jinnah", "Mehran", "Saif", "Iqbal", "Taj"],
    suffixes: ["Embroidery Works", "Patches & Badges", "Stitch House", "Textile Crafts", "Emblem Co.", "Sports Badges", "Insignia Mfg.", "Threadworks", "Patch Industries", "Uniform Badges"],
    cities: [["Sialkot", "Punjab"], ["Lahore", "Punjab"], ["Karachi", "Sindh"], ["Faisalabad", "Punjab"], ["Gujranwala", "Punjab"], ["Islamabad", "ICT"]],
    phone: "+92 3",
  },
  US: {
    weight: 30,
    prefixes: ["Lone Star", "Pacific", "Golden Gate", "Liberty", "Empire", "Appalachian", "Great Lakes", "Bayou", "Rocky Mountain", "Sunbelt", "Hudson", "Cascade", "Mesa", "Patriot", "Heartland", "Brooklyn", "Motor City", "Peachtree", "Redwood", "Silver State"],
    suffixes: ["Patch Co.", "Embroidery", "Emblems", "Custom Patches", "Stitch Studio", "Badge Works", "Apparel Decoration", "Chenille Shop"],
    cities: [["Los Angeles", "CA"], ["Dallas", "TX"], ["New York", "NY"], ["Miami", "FL"], ["Chicago", "IL"], ["Charlotte", "NC"], ["Phoenix", "AZ"], ["Seattle", "WA"], ["Denver", "CO"], ["Atlanta", "GA"]],
    phone: "+1 ",
  },
  IN: {
    weight: 25,
    prefixes: ["Tirupur", "Ludhiana", "Jaipur", "Ganga", "Surat", "Kaveri", "Bharat", "Shree", "Lotus", "Coimbatore", "Agra", "Noida", "Bengal", "Narmada", "Deccan", "Malabar"],
    suffixes: ["Embroidery Exports", "Woven Labels", "Badges & Crests", "Textile Emblems", "Patch Industries", "Garment Trims"],
    cities: [["Tirupur", "Tamil Nadu"], ["Ludhiana", "Punjab"], ["New Delhi", "Delhi"], ["Mumbai", "Maharashtra"], ["Jaipur", "Rajasthan"], ["Surat", "Gujarat"], ["Noida", "Uttar Pradesh"], ["Kolkata", "West Bengal"]],
    phone: "+91 9",
  },
} as const;
export type SellerMarket = keyof typeof SELLER_MARKETS;

export const FIRST_NAMES = ["Ayesha", "Bilal", "Hamza", "Sana", "Usman", "Fatima", "Ali", "Zainab", "Daniel", "Olivia", "Marcus", "Emily", "Jordan", "Priya", "Rahul", "Ananya", "Vikram", "Meera", "Carlos", "Sofia", "Tyler", "Hannah", "Omar", "Imran", "Nadia", "Kevin", "Grace", "Arjun", "Ravi", "Noah"];
export const LAST_NAMES = ["Khan", "Ahmed", "Malik", "Qureshi", "Butt", "Sheikh", "Chaudhry", "Mirza", "Johnson", "Martinez", "Brooks", "Nguyen", "Patel", "Sharma", "Gupta", "Iyer", "Reddy", "Carter", "Rivera", "Thompson", "Walker", "Hughes", "Siddiqui", "Rehman", "Kapoor", "Mehta"];

export const BUYER_BRANDS = [
  "Northbound Supply", "Ember & Oak", "Static Bloom", "Ridgeway Athletics", "Copperline Caps", "Lantern Club", "Harbor Street", "Bluefin Racing", "Granite Guild", "Moonlit Collective",
  "Pine Hollow Scouts", "Velvet Arcade", "Summit Run Co", "Driftwood Denim", "Halcyon Events", "Iron Kite", "Juniper Lane", "Kestrel Outdoor", "Lowtide Skate", "Maple & Mortar",
  "Desert Rose Rodeo", "Brickhouse Fire Dept.", "Coastal Surf Club", "Redline Motorsport", "Cedar Ridge Academy", "Foxglove Studio", "Saltwater Supply", "Wild Pines Camp", "Union Brewing", "Atlas Workwear",
  "Night Owl Records", "Sunset Softball League", "Trailhead Outfitters", "Valor Security", "Gridiron Boosters", "Rust Belt Riders", "Bay City Rugby", "Hilltop Coffee", "Neon Tiger Apparel", "Aurora Robotics Team",
];
export const US_STATES = ["CA", "NY", "TX", "FL", "IL", "WA", "CO", "GA", "NC", "OR", "AZ", "MA", "PA", "OH", "MI", "TN", "NJ", "VA", "MN", "NV"];

export const BUYER_NOTES: Record<DemoPatchType, string[]> = {
  EMBROIDERED: ["Logo patch for our fall jacket drop, navy twill with gold thread.", "Crest for team jerseys — need merrowed edge.", "Left-chest logo for staff polos, 75% stitch coverage."],
  PVC: ["Rubber patch for tactical backpacks, hook & loop.", "3D PVC logo for hats, two-level raised design.", "Morale patches for our outdoor line."],
  CHENILLE: ["Varsity letters for the senior class jackets.", "Fuzzy chenille logo for a streetwear hoodie collab.", "Letterman patches with felt backing."],
  WOVEN: ["Fine-detail woven patch for denim back pockets.", "Small woven tags with tiny text for hats.", "Woven crest with gradient-free artwork."],
  SUBLIMATED: ["Full-colour photo patch for an event giveaway.", "Sunset landscape design for a camp program.", "Bright gradient logo — sublimation recommended."],
  LEATHER: ["Debossed leather patch for trucker hats.", "Faux leather label for jeans waistband.", "Laser-etched leather patches for a brewery."],
  PRINTED: ["Low-cost printed patches for a charity 5K.", "Printed name tags for volunteer vests.", "Simple printed logo patches for kids' camp shirts."],
};

/** Unit price bands (USD) used when demo sellers write quotations. */
export const UNIT_PRICE: Record<DemoPatchType, [number, number]> = {
  EMBROIDERED: [0.85, 2.4], PVC: [1.1, 2.9], CHENILLE: [2.2, 4.8], WOVEN: [0.7, 1.9], SUBLIMATED: [0.6, 1.6], LEATHER: [1.6, 3.9], PRINTED: [0.45, 1.2],
};

export const DEMO_PASSWORD_DEFAULT = "PatchMatch2026!";
export const DEMO_ACCOUNTS = {
  admin: { email: "admin@patchmatch.demo", name: "Ayesha Malik", label: "Admin" },
  seller: { email: "seller@patchmatch.demo", name: "Hamza Qureshi", label: "Manufacturer", company: "Markhor Stitch Works" },
  buyer: { email: "buyer@patchmatch.demo", name: "Olivia Carter", label: "Buyer", company: "Ridgeway Athletics" },
} as const;
