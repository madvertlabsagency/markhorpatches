import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Lightbulb } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

type Step = { title: string; body: string; tips?: string[] };
type Guide = { eyebrow: string; title: string; intro: string; image: string; steps: Step[]; faq: { q: string; a: string }[]; cta: { label: string; href: string } };

const GUIDES: Record<"buyers" | "sellers", Guide> = {
  buyers: {
    eyebrow: "Buyer guide",
    title: "Get quotes for custom patches — step by step",
    intro: "PatchMatch is free for buyers. You describe your patch once, we verify the request and match it with manufacturers who actually make it, and you compare their quotes.",
    image: "/photos/hero-patches-2.webp",
    steps: [
      { title: "Start a request", body: "Click “Get Free Quotes”. Pick a patch type (or “Not sure”), how you'll use it, the size and quantity.", tips: ["Not sure which type? Embroidered suits most logos; PVC for outdoor gear; woven for fine detail."] },
      { title: "Upload your artwork", body: "PNG, JPG, PDF or SVG. Your original file stays private — manufacturers see only a blurred preview until they're approved." },
      { title: "Delivery, budget and contact", body: "Tell us where to ship and when you need it. A budget is optional but helps manufacturers quote accurately." },
      { title: "Choose how you're contacted", body: "Share your contact details with the approved manufacturer, or keep everything inside PatchMatch messaging. On the marketplace form you can also choose one manufacturer (exclusive) or up to three for more quotes.", tips: ["Marketing emails are a separate, unticked box — we never add you without asking."] },
      { title: "Confirm your email", body: "We send a verification link. Your request is reviewed only after you confirm — this keeps spam out and your request credible to manufacturers." },
      { title: "Compare quotes", body: "Quotes arrive in your dashboard (sign in with the same email) and by email. Each one is itemised: unit price, setup, sample, shipping, lead time and payment terms." },
      { title: "Message, shortlist, select", body: "Ask questions, shortlist favourites and select the manufacturer you want. You agree the order directly with them — PatchMatch never takes a commission." },
    ],
    faq: [
      { q: "Is it really free?", a: "Yes. Buyers never pay PatchMatch. Manufacturers pay a small fee to access qualified requests." },
      { q: "Who sees my details?", a: "Before purchase, manufacturers see only an anonymised summary. Your contact details go only to the manufacturer(s) you allowed — never more than you chose." },
      { q: "Do I have to accept a quote?", a: "No. Choose any quote, or none." },
    ],
    cta: { label: "Get free quotes", href: "/get-quotes" },
  },
  sellers: {
    eyebrow: "Manufacturer guide",
    title: "Win custom patch orders from verified US buyers",
    intro: "PatchMatch sends you requests that match what you make. No subscription — you pay only for the requests you choose to unlock, at a price shown before you buy.",
    image: "/photos/p-fabric.webp",
    steps: [
      { title: "Apply as a manufacturer", body: "Create an account and add your business details: legal name, factory location, years operating and export markets." },
      { title: "Add capabilities", body: "For each patch type set your MOQ, maximum quantity, weekly capacity, standard and rush lead times. These decide which requests reach you — keep them accurate.", tips: ["More patch types and shipping destinations = more matching requests."] },
      { title: "Get verified", body: "Upload your business registration, factory photos and a few sample patches. Our team reviews them; only verified manufacturers can unlock requests." },
      { title: "Watch opportunities arrive", body: "Matching requests appear in Opportunities and as notifications. Filter by order value (e.g. $300+), patch type, or requests with no offers yet.", tips: ["“No offers yet — be first” means nobody has claimed it. Exclusive requests disappear the moment someone else unlocks them."] },
      { title: "Unlock a request", body: "Pay the unlock fee (pilot: $10 Standard Verified, $12.50 Contact-Ready, $15 Premium Production-Ready) with prepaid credits or an approved payment method. Access opens only after payment is confirmed." },
      { title: "Contact the buyer and quote", body: "You'll see the full specification, original artwork and the buyer's contact details they agreed to share. Send an itemised quote from the builder — the buyer compares it side by side." },
      { title: "Invalid request? Claim a credit", body: "If contact details bounce or the request is clearly invalid, file a quality claim. Upheld claims are credited back to your wallet." },
    ],
    faq: [
      { q: "Does unlocking guarantee an order?", a: "No. A request is a buying opportunity, not a guaranteed sale. Fast, clear quotes win most often." },
      { q: "Is there a subscription?", a: "No. Pay per unlocked request only. Prepaid credits are optional." },
      { q: "Can I pause?", a: "Yes. Pause your account or set daily request and spend limits in Settings." },
    ],
    cta: { label: "Apply as a manufacturer", href: "/become-a-seller/apply" },
  },
};

export async function generateMetadata({ params }: { params: Promise<{ audience: string }> }): Promise<Metadata> {
  const g = GUIDES[(await params).audience as "buyers" | "sellers"];
  return g ? { title: g.title, description: g.intro } : {};
}

export function generateStaticParams() {
  return [{ audience: "buyers" }, { audience: "sellers" }];
}

export default async function GuidePage({ params }: { params: Promise<{ audience: string }> }) {
  const audience = (await params).audience;
  const g = GUIDES[audience as "buyers" | "sellers"];
  if (!g) notFound();
  return (
    <>
      <section className="bg-navy-hero text-white">
        <div className="container-page grid items-center gap-10 py-14 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="font-display text-xs font-semibold tracking-[0.28em] text-gold uppercase">{g.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">{g.title}</h1>
            <p className="mt-4 max-w-xl text-white/75">{g.intro}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href={g.cta.href} size="lg">{g.cta.label} <ArrowRight className="h-4 w-4" /></ButtonLink>
              <ButtonLink href={audience === "buyers" ? "/guide/sellers" : "/guide/buyers"} variant="outlineLight" size="lg">{audience === "buyers" ? "Manufacturer guide" : "Buyer guide"}</ButtonLink>
            </div>
          </div>
          <img src={g.image} alt="" aria-hidden className="mx-auto hidden w-full max-w-sm rotate-2 rounded-3xl shadow-2xl lg:block" />
        </div>
      </section>
      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1fr_320px]">
        <ol className="relative space-y-8 border-l-2 border-dashed border-orange/40 pl-8">
          {g.steps.map((s, i) => (
            <li key={s.title} className="relative">
              <span className="absolute top-0 -left-[3.05rem] grid h-10 w-10 place-items-center rounded-2xl bg-navy font-display text-sm font-bold text-gold shadow-[var(--shadow-card)]">{i + 1}</span>
              <h2 className="text-xl font-bold">{s.title}</h2>
              <p className="mt-1.5 max-w-2xl text-muted">{s.body}</p>
              {s.tips?.map((t) => (
                <p key={t} className="mt-3 flex max-w-2xl gap-2 rounded-xl bg-gold/15 px-3 py-2 text-sm"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#A27B3E]" />{t}</p>
              ))}
            </li>
          ))}
        </ol>
        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="font-bold">Quick answers</h2>
            <dl className="mt-3 space-y-3 text-sm">
              {g.faq.map((f) => (
                <div key={f.q}>
                  <dt className="font-semibold">{f.q}</dt>
                  <dd className="mt-0.5 text-muted">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="card p-5 text-sm">
            <p className="font-semibold">Need help?</p>
            <p className="mt-1 text-muted">Browse the <Link href="/help" className="font-semibold text-electric hover:underline">help center</Link> or watch the <Link href="/live" className="font-semibold text-electric hover:underline">live marketplace</Link>.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
