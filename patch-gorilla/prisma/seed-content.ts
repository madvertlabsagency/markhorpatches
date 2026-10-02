/** Seed content: FAQs and learning-center articles. All editable in /admin/content. */

export const GENERAL_FAQS: { q: string; a: string; category: string; home?: boolean }[] = [
  { q: "Is the mockup really free?", a: "Yes. Send us your artwork and we'll create a digital mockup at no cost and with no obligation to order.", category: "Mockups & proofs", home: true },
  { q: "Will I see my patch before it's made?", a: "Always. Nothing goes into production until you approve a digital proof showing the artwork, size, colors and production specifications. You can request revisions until it's right.", category: "Mockups & proofs", home: true },
  { q: "What if my artwork isn't production-ready?", a: "That's our problem, not yours. Send a sketch, a photo or a low-resolution logo and our designers will prepare it for production as part of free artwork support.", category: "Artwork", home: true },
  { q: "What file types can I upload?", a: "PNG, JPG, PDF, SVG, AI and EPS. Vector files (AI, EPS, SVG, PDF) are ideal, but we can work with almost anything.", category: "Artwork" },
  { q: "How is patch size measured?", a: "We quote patch size as the average of width and height. A 3\" × 2\" patch is quoted as a 2.5\" patch. We still produce your exact width and height.", category: "Sizing & pricing", home: true },
  { q: "Is there a minimum order?", a: "Minimums depend on the patch style — as low as 10 pieces for embroidered, woven and printed patches. The configurator shows the minimum for each style.", category: "Sizing & pricing", home: true },
  { q: "How long does production take?", a: "Most orders ship in about 8–14 business days after proof approval, depending on the patch style. Rush production is available on most styles.", category: "Production & shipping", home: true },
  { q: "Where do you ship?", a: "We ship across the United States with tracked delivery. Contact us for international orders.", category: "Production & shipping" },
  { q: "What happens if something is wrong with my order?", a: "If we manufacture something differently from the production specification you approved, we'll make it right — our mistake, our cost.", category: "Quality", home: true },
  { q: "Which backing should I choose?", a: "Sew-on is the most permanent. Iron-on is easy for most fabrics. Velcro (hook & loop) makes patches swappable. Peel & stick is best for temporary use. Not sure? Our team will recommend one with your proof.", category: "Backings & borders" },
  { q: "What's the difference between merrowed and heat-cut borders?", a: "A merrowed border is a thick, overlocked thread edge for simple shapes like circles and rectangles. A heat-cut border is sealed with a hot knife and follows any custom outline.", category: "Backings & borders" },
  { q: "Can I reorder the same patch later?", a: "Yes. Your approved designs are saved in your account, so reordering takes a couple of clicks.", category: "Orders & account" },
];

export const PRODUCT_FAQS: Record<string, { q: string; a: string }[]> = {
  "embroidered-patches": [
    { q: "How small can text be on an embroidered patch?", a: "As a rule of thumb, keep lettering at least about 1/4\" tall. For smaller text, woven patches hold detail better." },
    { q: "What does embroidery coverage mean?", a: "Coverage is how much of the patch surface is stitched. Our pricing includes up to full coverage, so you won't be surprised by coverage upcharges." },
    { q: "Can embroidered patches be washed?", a: "Yes. Sewn-on embroidered patches are machine washable. For iron-on patches, wash inside out on cold." },
  ],
  "woven-patches": [
    { q: "When should I choose woven over embroidered?", a: "Choose woven when your design has small text, thin lines or fine detail. Choose embroidered for a raised, textured look." },
    { q: "Are woven patches thinner?", a: "Yes — woven patches are thinner and more flexible, which makes them comfortable on lightweight apparel." },
  ],
  "pvc-patches": [
    { q: "Are PVC patches waterproof?", a: "Yes. PVC is a soft rubber that's waterproof and resistant to UV and wear." },
    { q: "Why is the minimum higher for PVC?", a: "PVC patches are produced from a custom mold, so small runs aren't economical. Unit prices drop quickly as quantity grows." },
    { q: "Can PVC patches be ironed on?", a: "No — heat damages PVC. Choose sew-on, Velcro, hook & loop or peel & stick instead." },
  ],
  "chenille-patches": [
    { q: "What's chenille made of?", a: "Chenille uses looped yarn on a felt base for a soft, fuzzy surface, often combined with embroidered details." },
    { q: "What size works best for chenille?", a: "Chenille shines at larger sizes — typically 3\" and up — where the texture has room to show." },
  ],
  "leather-patches": [
    { q: "Is the leather genuine?", a: "We offer genuine and synthetic leather. Your proof will show the exact material and finish." },
    { q: "How are leather patches attached to hats?", a: "Most hat leather patches are sewn on. Peel & stick is available for heat-press application." },
  ],
  "printed-patches": [
    { q: "Can you print photographs?", a: "Yes. Printed patches reproduce photos and gradients with unlimited colors." },
    { q: "How durable are printed patches?", a: "Dye-sublimation bonds ink into the fabric, so the print won't crack or peel. They're well suited to apparel and accessories." },
  ],
  "3d-puff-patches": [
    { q: "Can I combine flat and puff embroidery?", a: "Yes. Many designs puff the main lettering and keep details flat. We'll recommend the best split on your proof." },
    { q: "Does 3D puff work for small text?", a: "Puff works best on bold, thick shapes. Very small text is better kept flat." },
  ],
  "custom-patches": [
    { q: "Which patch type is right for me?", a: "Try the Patch Finder — answer six quick questions and we'll recommend a style. You can always override the recommendation." },
  ],
};

export const ARTICLE_CATEGORIES = [
  { slug: "guides", name: "Guides" },
  { slug: "comparisons", name: "Comparisons" },
  { slug: "artwork", name: "Artwork" },
];

export const ARTICLES: { slug: string; title: string; excerpt: string; category: string; minutes: number; body: string }[] = [
  {
    slug: "embroidered-vs-woven-patches", title: "Embroidered vs Woven Patches: Which Should You Choose?", category: "comparisons", minutes: 5,
    excerpt: "Texture or detail? Here's how to decide between the two most popular patch styles.",
    body: `## The short answer
Choose **embroidered** for a raised, textured, classic look. Choose **woven** when your design has small text or fine detail.

## How they're made
Embroidered patches are stitched on top of a twill base with thicker thread. Woven patches are made from thinner threads woven together, more like a clothing label.

## Detail
Woven patches reproduce thin lines and small lettering far better. If your logo has text under about 1/4" tall, woven is usually the safer choice.

## Texture and feel
Embroidery has depth you can feel. Woven is flat, smooth and thinner — comfortable on lightweight apparel.

## Price
At most quantities, woven and embroidered are close in price. Check live prices in the patch builder.

## Still unsure?
Upload your artwork and request a free mockup. We'll recommend the style that reproduces your design best.`,
  },
  {
    slug: "pvc-vs-embroidered-patches", title: "PVC vs Embroidered Patches", category: "comparisons", minutes: 4,
    excerpt: "Rubber or thread? A practical comparison for outdoor, tactical and everyday use.",
    body: `## Where PVC wins
PVC patches are waterproof, resist UV and wear, and wipe clean. They're ideal for outdoor gear, bags and anything that gets wet or muddy.

## Where embroidery wins
Embroidered patches have a classic textile look and lower minimums. They feel at home on apparel, hats and uniforms.

## Detail and dimension
PVC is molded in layers, so it can create bold 2D or 3D dimensional effects. Embroidery has natural thread texture.

## Attachment
PVC can't be ironed on. Choose sew-on, Velcro hook & loop or peel & stick. Embroidered patches support every backing.

## Bottom line
Weather and durability → PVC. Classic apparel look → embroidered.`,
  },
  {
    slug: "how-patch-sizing-works", title: "How Patch Sizing Works", category: "guides", minutes: 3,
    excerpt: "Why a 3\" × 2\" patch is quoted as 2.5\" — and how to pick the right size.",
    body: `## Quoted size
Patch makers quote size as the **average of width and height**. A 3" wide by 2" tall patch has a quoted size of (3 + 2) / 2 = 2.5".

## We still make your exact size
Quoted size is only used for pricing. Your patch is produced at the exact width and height you choose.

## Common sizes
- **2" – 2.5"**: hats, sleeves and small chest logos
- **3" – 3.5"**: the most popular all-round size
- **4" – 5"**: jacket fronts, bags and statement pieces
- **6"+**: jacket backs

## Try the size guide
Use our size visualizer to compare sizes side by side. Remember that screens scale differently, so use a ruler for an exact check.`,
  },
  {
    slug: "iron-on-vs-sew-on-patches", title: "Iron-On vs Sew-On Patches", category: "guides", minutes: 4,
    excerpt: "The pros and cons of the two most common backings.",
    body: `## Sew-on
The most permanent attachment. Sewn patches survive repeated washing and heavy use. Best for uniforms, workwear and jackets.

## Iron-on
A heat-activated adhesive lets you press patches onto most cotton and poly-blend fabrics with an iron or heat press. Fast and easy.

## When not to iron
Avoid iron-on for nylon, leather, rain gear and heat-sensitive fabrics. PVC patches can't be ironed on.

## The best of both
Many customers iron on to position a patch, then add a few stitches around the edge for permanence.`,
  },
  {
    slug: "best-patch-type-for-hats", title: "The Best Patch Type for Hats", category: "guides", minutes: 4,
    excerpt: "Leather, 3D puff, woven or embroidered? What works best on the front of a cap.",
    body: `## Leather
The premium choice for trucker and dad hats. Debossed or laser-engraved logos look refined and age well.

## 3D puff
Raised foam lettering makes logos pop. Great for streetwear caps.

## Embroidered
Classic and versatile — works on almost every hat style.

## Woven
Best when your logo has fine detail or small text.

## Size tips
Most hat front patches are between 2" and 3" wide. Measure the front panel of your hat before ordering.`,
  },
  {
    slug: "how-to-prepare-artwork", title: "How to Prepare Artwork for Patches", category: "artwork", minutes: 5,
    excerpt: "Vector or not, here's how to send artwork that turns into a great patch.",
    body: `## Best: vector files
AI, EPS, SVG and PDF files scale without losing quality. If you have them, send them.

## Good: high-resolution images
PNG or JPG at 1000px or more on the long side works well.

## Fine: anything else
A sketch, a photo of an existing patch, or a napkin drawing. Our free artwork support turns it into production-ready art.

## Simplify for thread
Thread can't reproduce tiny details or soft gradients. Bold shapes and fewer colors usually make better embroidered patches. If your design needs gradients, consider printed or woven.

## Include notes
Tell us thread colors (Pantone references help), what text must be legible and anything you want emphasized.`,
  },
  {
    slug: "custom-patch-pricing-guide", title: "Custom Patch Pricing Guide", category: "guides", minutes: 5,
    excerpt: "What actually drives the price of a custom patch — and how to get the best value.",
    body: `## The three big factors
1. **Patch type** — PVC and leather cost more than woven or printed.
2. **Size** — larger patches use more material and production time.
3. **Quantity** — per-patch prices drop significantly as quantity grows.

## Options
Backings, special threads, packaging and rush production add to the per-patch price. The patch builder shows every modifier before you commit.

## Getting the best value
- Order a slightly larger run to reach the next price break.
- Choose the patch type that fits your artwork rather than the most expensive one.
- Plan ahead to avoid rush fees.

## Transparent pricing
Our prices are listed openly. The price you see in the builder is calculated by the same engine used at checkout.`,
  },
  {
    slug: "patch-backing-guide", title: "The Complete Patch Backing Guide", category: "guides", minutes: 4,
    excerpt: "No backing, sew-on, iron-on, Velcro, hook & loop or peel & stick — explained.",
    body: `## No backing / Sew-on
Clean finish for stitching. The most permanent attachment.

## Iron-on
Heat-activated adhesive. Quick to apply to most fabrics.

## Velcro hook
The hook side only, for gear that already has loop panels (tactical vests, bags).

## Hook & loop
Both sides supplied — sew the loop to your garment and swap patches anytime.

## Peel & stick
Adhesive backing for events, giveaways and temporary use.

## Not sure?
Tell us where the patch is going and we'll recommend a backing with your proof.`,
  },
];
