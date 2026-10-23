export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readMinutes: number;
  tag: string;
  body: React.ReactNode;
}

export const ARTICLES: Article[] = [
  {
    slug: "how-to-write-a-custom-patch-rfq",
    title: "How to write a custom patch request manufacturers can actually quote",
    excerpt: "The seven details that decide whether you get an accurate quote or a round of follow-up questions.",
    date: "2026-10-15",
    readMinutes: 5,
    tag: "Buying guide",
    body: (
      <>
        <p>Manufacturers price patches on a handful of variables. Give them up front and you'll get comparable, accurate quotes faster.</p>
        <h2>1. Size</h2>
        <p>Measure width and height of the finished patch. Many manufacturers price by the average of the two, so a 3×2 in patch is often priced like a 2.5 in patch.</p>
        <h2>2. Quantity</h2>
        <p>Unit price usually falls with volume because setup costs (digitising, moulds) are spread across more units. If you might re-order, say so.</p>
        <h2>3. Construction</h2>
        <p>Embroidered, woven, PVC, chenille, sublimated, leather or printed. If you're unsure, say so — a good manufacturer will recommend one.</p>
        <h2>4. Colours and coverage</h2>
        <p>Number of colours affects embroidery and PVC pricing. Stitch coverage (how much of the background is stitched) affects embroidered patch cost.</p>
        <h2>5. Backing and border</h2>
        <p>Sew-on, iron-on, hook-and-loop or adhesive; merrowed, hot-cut or laser-cut edges.</p>
        <h2>6. Artwork</h2>
        <p>Vector (PDF/SVG) is ideal. A clear PNG works too. Mention Pantone colours if you have them.</p>
        <h2>7. Deadline and destination</h2>
        <p>Give the date you need patches <em>in hand</em> and where they ship. This determines who can realistically deliver.</p>
      </>
    ),
  },
  {
    slug: "embroidered-vs-woven-vs-pvc",
    title: "Embroidered vs woven vs PVC patches: choosing the right construction",
    excerpt: "A practical comparison of the three most requested patch types — detail, durability and when each makes sense.",
    date: "2026-10-08",
    readMinutes: 6,
    tag: "Patch types",
    body: (
      <>
        <p>All three are excellent — for different jobs.</p>
        <h2>Embroidered</h2>
        <p>Raised thread on twill. Tactile and classic. Best for bold logos and lettering; very fine detail may need simplifying.</p>
        <h2>Woven</h2>
        <p>Fine threads woven flat. Holds small text and intricate detail; thinner and lighter, great for labels and hats.</p>
        <h2>PVC</h2>
        <p>Moulded soft rubber. Waterproof and durable with crisp layered 3D detail. A mould is typically required, which favours larger runs.</p>
        <h2>Still unsure?</h2>
        <p>Choose “Not sure” in your request — manufacturers will recommend a construction in their quotes.</p>
      </>
    ),
  },
  {
    slug: "how-patchmatch-protects-buyer-privacy",
    title: "How we protect buyer privacy in a lead marketplace",
    excerpt: "Anonymised previews, consent-bound disclosure and exclusive-by-default requests — and why we built it this way.",
    date: "2026-10-01",
    readMinutes: 4,
    tag: "Trust",
    body: (
      <>
        <p>Lead marketplaces often feel like your phone number was sold to twenty companies. We designed PatchMatch AI to do the opposite.</p>
        <h2>Anonymised previews</h2>
        <p>Before purchase, manufacturers see specifications only. Names, emails, phone numbers, postal codes and website addresses are removed, and contact details typed into notes are automatically masked. Artwork is shown as a small blurred preview with metadata stripped.</p>
        <h2>Consent-bound disclosure</h2>
        <p>You choose whether an approved manufacturer receives your contact details or communicates through platform messaging only. Disclosure happens only after a payment is confirmed by the provider — never on a mere attempt — and every disclosure is logged.</p>
        <h2>Exclusive by default</h2>
        <p>By default, only one manufacturer can purchase your request. Changing that requires your explicit consent.</p>
      </>
    ),
  },
];
