import type { Metadata } from "next";
import Link from "next/link";
import { EyeOff, Lock, MessagesSquare, ShieldCheck, UserCheck, BellOff } from "lucide-react";
import { CtaBand, FaqSection, MarketingHero, SectionHeading } from "@/components/marketing/sections";
import { BUYER_FAQS } from "@/content/faqs";

export const metadata: Metadata = {
  title: "Buyer protection & privacy",
  description: "How PatchMatch protects your contact details and artwork: anonymised previews, three privacy options, limited sharing and no obligation to order.",
  alternates: { canonical: "/buyer-protection" },
};

const OPTIONS = [
  { key: "A", title: "Platform messaging only", tag: "Default", body: "Manufacturers that unlock your request can message you inside PatchMatch. Your email address and phone number are never shared." },
  { key: "B", title: "I choose who gets my details", tag: "Explicit consent", body: "You chat on the platform first, then share your contact details with a specific manufacturer when you're ready — one conversation at a time." },
  { key: "C", title: "Share with unlocking manufacturers", tag: "Explicit consent", body: "Manufacturers that unlock your request receive your name, email and phone so they can contact you directly. Fastest, least private." },
];

const PROMISES = [
  { icon: EyeOff, title: "Anonymised previews", body: "Before unlocking, manufacturers see specs only — no name, email, phone, exact address or legible artwork (just a blurred, watermarked preview)." },
  { icon: UserCheck, title: "Reviewed manufacturers", body: "Only manufacturers our team has reviewed can unlock requests. Badges show exactly what was checked: identity, then production capability." },
  { icon: Lock, title: "Limited sharing", body: "Requests are exclusive by default (one manufacturer). If you opt in to comparison, at most three can unlock it — then it leaves the marketplace." },
  { icon: MessagesSquare, title: "Report and block", body: "Every conversation has a report button. Our team reviews reports and can suspend manufacturers who misuse buyer information." },
  { icon: BellOff, title: "You control reminders", body: "Up to two quote reminders, which stop when you select a manufacturer or close your request. Turn them off anytime. Marketing emails need a separate opt-in." },
  { icon: ShieldCheck, title: "Your artwork stays private", body: "Original files are stored privately and released only to manufacturers you're working with. They are never shown publicly." },
];

export default function BuyerProtectionPage() {
  return (
    <>
      <MarketingHero eyebrow="Buyer protection & privacy" title="Your details stay yours until you decide." description="PatchMatch is free for buyers. Manufacturers pay a small fee to unlock qualified requests — and they only ever receive what you've agreed to share." />
      <section className="container-page py-20">
        <SectionHeading eyebrow="Three privacy options" title="Pick how manufacturers can reach you." description="You choose when you submit, and you can tighten the setting later from your request page." />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {OPTIONS.map((o) => (
            <div key={o.key} className="card p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy font-display text-lg font-bold text-white">{o.key}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${o.key === "A" ? "bg-green/15 text-green" : "bg-orange/15 text-electric"}`}>{o.tag}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">{o.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{o.body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-surface py-20">
        <div className="container-page">
          <SectionHeading eyebrow="What we promise" title="Protection built into every step." />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PROMISES.map((p) => (
              <div key={p.title} className="rounded-2xl border border-line bg-bg p-6">
                <p.icon className="h-6 w-6 text-electric" />
                <h3 className="mt-3 font-display font-bold">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{p.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-3xl text-sm text-muted">
            What we don&apos;t promise: PatchMatch does not make patches, guarantee prices, replies or orders, or hold payments. You agree price, production and payment directly with the manufacturer you choose.
            See the <Link href="/privacy" className="font-semibold text-electric hover:underline">privacy policy</Link> and <Link href="/data-sharing-policy" className="font-semibold text-electric hover:underline">data sharing policy</Link> (drafts pending legal review).
          </p>
        </div>
      </section>
      <FaqSection faqs={BUYER_FAQS.slice(2, 6)} title="Privacy questions" />
      <CtaBand title="Get free patch quotes — privately." body="Platform messaging only is the default. Share more only if you want to." primary={{ label: "Get Free Patch Quotes", href: "/get-quotes" }} secondary={{ label: "How PatchMatch Works", href: "/how-it-works" }} />
    </>
  );
}
