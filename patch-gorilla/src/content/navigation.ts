export const PATCH_NAV = [
  { code: "EMBROIDERED", href: "/embroidered-patches", label: "Embroidered", blurb: "Classic raised thread & texture" },
  { code: "PVC", href: "/pvc-patches", label: "PVC", blurb: "Waterproof rubber, built tough" },
  { code: "WOVEN", href: "/woven-patches", label: "Woven", blurb: "Crisp detail, small text" },
  { code: "CHENILLE", href: "/chenille-patches", label: "Chenille", blurb: "Fuzzy varsity texture" },
  { code: "LEATHER", href: "/leather-patches", label: "Leather", blurb: "Debossed premium labels" },
  { code: "PRINTED", href: "/printed-patches", label: "Printed", blurb: "Full color, photos & gradients" },
  { code: "PUFF_3D", href: "/3d-puff-patches", label: "3D Puff", blurb: "Raised foam, hat favorite" },
  { code: "EMBROIDERED", href: "/build-your-patch?name=1", label: "Name Patches", blurb: "Personalized name tapes & tags" },
] as const;

export const MAIN_NAV = [
  { href: "/custom-patches", label: "Patches", mega: true },
  { href: "/industries", label: "Industries" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/gallery", label: "Gallery" },
  { href: "/reviews", label: "Reviews" },
  { href: "/resources", label: "Resources" },
  { href: "/support", label: "Support" },
] as const;

export const FOOTER_NAV = {
  Patches: [
    { href: "/custom-patches", label: "All custom patches" },
    { href: "/embroidered-patches", label: "Embroidered" },
    { href: "/pvc-patches", label: "PVC" },
    { href: "/woven-patches", label: "Woven" },
    { href: "/chenille-patches", label: "Chenille" },
    { href: "/leather-patches", label: "Leather" },
    { href: "/printed-patches", label: "Printed" },
    { href: "/3d-puff-patches", label: "3D Puff" },
  ],
  Industries: [
    { href: "/industries/streetwear", label: "Streetwear" },
    { href: "/industries/apparel-brands", label: "Apparel brands" },
    { href: "/industries/businesses", label: "Businesses" },
    { href: "/industries/sports-teams", label: "Sports teams" },
    { href: "/industries/clubs", label: "Clubs" },
    { href: "/industries/schools", label: "Schools" },
    { href: "/industries/events", label: "Events" },
    { href: "/industries/creators", label: "Creators" },
  ],
  Resources: [
    { href: "/resources", label: "Learning center" },
    { href: "/patch-finder", label: "Patch finder" },
    { href: "/size-guide", label: "Size guide" },
    { href: "/pricing", label: "Pricing" },
    { href: "/gallery", label: "Gallery" },
    { href: "/faq", label: "FAQ" },
  ],
  Company: [
    { href: "/about", label: "About" },
    { href: "/how-it-works", label: "How it works" },
    { href: "/reviews", label: "Reviews" },
    { href: "/contact", label: "Contact" },
  ],
  Support: [
    { href: "/support", label: "Help center" },
    { href: "/track-order", label: "Track an order" },
    { href: "/free-mockup", label: "Free mockup" },
    { href: "/account", label: "My account" },
  ],
} as const;

export const LEGAL_NAV = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refund-policy", label: "Refund & Remake Policy" },
  { href: "/shipping-policy", label: "Shipping Policy" },
  { href: "/accessibility", label: "Accessibility" },
] as const;
