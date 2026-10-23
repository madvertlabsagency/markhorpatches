import Link from "next/link";
import { ArrowRight, BadgeCheck, EyeOff, FileSearch, Gauge, Lock, MessagesSquare, Scale, ShieldCheck, Sparkles, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { MatchVisual } from "@/components/marketing/MatchVisual";
import { QuickStart } from "@/components/marketing/QuickStart";
import { CheckList, CtaBand, FaqSection, PatchTypeGrid, ProcessSteps, SectionHeading } from "@/components/marketing/sections";
import { PatchArt } from "@/components/brand/PatchArt";
import { BUYER_FAQS } from "@/content/faqs";

export default function HomePage() {
  return (
    <>
      {/* 1 · Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="grid-bg-dark absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_75%)]" aria-hidden />
        <div className="absolute -top-40 left-1/2 h-[34rem] w-[60rem] -translate-x-1/2 rounded-full bg-electric/20 blur-[140px]" aria-hidden />
        <div className="container-page relative grid items-center gap-14 pt-16 pb-20 sm:pt-24 lg:grid-cols-[1.1fr_1fr] lg:pb-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-medium text-white/75">
              <Sparkles className="h-3.5 w-3.5 text-cyan" /> AI-assisted sourcing · human-verified manufacturers
            </p>
            <h1 className="mt-6 text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.035em] sm:text-6xl lg:text-[4.1rem]">
              Your custom patch. <span className="bg-gradient-to-r from-electric via-cyan to-white bg-clip-text text-transparent">Matched</span> with the right manufacturer.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">Upload your artwork, share your requirements, and connect with qualified custom patch manufacturers.</p>
            <div className="mt-8 max-w-xl">
              <QuickStart tone="dark" />
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/60">
              <span className="flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-cyan" /> Free for buyers
              </span>
              <span className="flex items-center gap-1.5">
                <EyeOff className="h-4 w-4 text-cyan" /> Contact details stay private
              </span>
              <Link href="/become-a-seller" className="flex items-center gap-1.5 font-semibold text-white hover:text-cyan">
                Become a Verified Manufacturer <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <MatchVisual />
        </div>
      </section>

      {/* 2 · Patch type selector */}
      <section className="container-page -mt-10 relative z-10">
        <div className="card p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <p className="font-display text-sm font-semibold">Start with a patch type</p>
            <Link href="/patch-types" className="text-sm font-semibold text-electric hover:underline">
              Compare all types →
            </Link>
          </div>
          <PatchTypeGrid compact />
        </div>
      </section>

      {/* 3 · Quick starter + 4 · How it works */}
      <section className="container-page py-24">
        <SectionHeading eyebrow="How it works" title="From idea to quotes in four steps." description="A complete request takes about 2–4 minutes. You stay in control of who sees your details." />
        <div className="mt-12">
          <ProcessSteps
            steps={[
              { title: "Describe your patch", body: "Choose a type, size, quantity, backing and deadline. Not sure? Our assistant explains the options." },
              { title: "Upload artwork", body: "PNG, JPG, PDF or SVG. Originals stay in private storage; manufacturers see only a blurred preview before unlock." },
              { title: "We verify & match", body: "We confirm your email, check your request, then rank verified manufacturers on capability, capacity and delivery." },
              { title: "Compare quotes", body: "Matched manufacturers send itemised quotes. Compare price, lead time, MOQ and sample policy side by side." },
            ]}
          />
        </div>
      </section>

      {/* 5 · Supported categories */}
      <section className="bg-surface py-24">
        <div className="container-page">
          <SectionHeading eyebrow="Patch categories" title="Every construction, one request form." description="Embroidered to PVC, chenille to leather — tell us what you need and we route it to manufacturers who actually make it." />
          <div className="mt-12">
            <PatchTypeGrid />
          </div>
        </div>
      </section>

      {/* 6 · Matching explanation */}
      <section className="relative overflow-hidden bg-navy py-24 text-white">
        <div className="grid-bg-dark absolute inset-0" aria-hidden />
        <div className="container-page relative grid gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeading dark eyebrow="Manufacturer matching" title="Hard filters first. Then a transparent score." description="AI helps read your request and explain matches — but eligibility is decided by explicit rules that AI can't override." />
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                ["Must pass", "Verified business · produces your patch type · MOQ fits · ships to you · can meet your deadline"],
                ["Then scored on", "Capability 25 · Capacity 20 · Delivery 20 · Quality 15 · Budget 10 · Response 5 · Logistics 5"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <p className="font-display text-xs tracking-[0.16em] text-cyan uppercase">{k}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {[
              { k: "Capability", v: 25, w: "92%" },
              { k: "Quantity & capacity", v: 20, w: "80%" },
              { k: "Delivery feasibility", v: 20, w: "74%" },
              { k: "Verified quality", v: 15, w: "60%" },
              { k: "Budget fit", v: 10, w: "100%" },
              { k: "Responsiveness", v: 5, w: "50%" },
              { k: "Logistics", v: 5, w: "70%" },
            ].map((f) => (
              <div key={f.k} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">{f.k}</span>
                  <span className="tabular text-white/45">weight {f.v}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-electric to-cyan" style={{ width: f.w }} />
                </div>
              </div>
            ))}
            <p className="text-xs text-white/40">Illustrative factor values. Every match stores its score breakdown and explanation for review.</p>
          </div>
        </div>
      </section>

      {/* 7 · Buyer benefits */}
      <section className="container-page py-24">
        <SectionHeading eyebrow="Why buyers use PatchMatch" title="Sourcing without the inbox flood." align="center" />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Lock, t: "Private by default", b: "No public listing of your brand or artwork. Contact details are released only within the limits you approve." },
            { icon: Users, t: "Exclusive requests", b: "By default only one verified manufacturer can unlock your request — no bidding wars in your inbox." },
            { icon: FileSearch, t: "Requests manufacturers can quote", b: "We flag missing specs and ask clarifying questions so you get accurate quotes, not guesses." },
            { icon: Scale, t: "Apples-to-apples comparison", b: "Itemised quotes: unit price, setup, sample, tooling, shipping, lead time and MOQ in one table." },
            { icon: MessagesSquare, t: "Messaging in one place", b: "Talk to manufacturers on-platform, even if you choose not to share your email or phone." },
            { icon: Gauge, t: "Free, with no obligation", b: "You're never charged. Choose any quote — or none. Agreements are between you and the manufacturer." },
          ].map((f) => (
            <div key={f.t} className="card p-6">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-electric/10 text-electric">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold">{f.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 8 · Verification */}
      <section className="bg-surface py-24">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="relative mx-auto grid w-full max-w-md grid-cols-2 gap-5">
            <div className="card col-span-2 flex items-center gap-4 p-5">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-success/12 text-success">
                <BadgeCheck className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold">Verified manufacturer</p>
                <p className="text-sm text-muted">Business documents, factory photos and samples reviewed by our team</p>
              </div>
            </div>
            <PatchArt type="CHENILLE" shape="circle" className="w-full" />
            <PatchArt type="LEATHER" shape="rounded" className="w-full" />
          </div>
          <div>
            <SectionHeading eyebrow="Supplier verification" title="People review every manufacturer." description="Software screens; humans decide. No manufacturer can access protected requests until they are approved." />
            <div className="mt-8">
              <CheckList items={["Business registration documents", "Factory and equipment photos", "Production sample portfolio", "Email and phone confirmation", "Ongoing quality claims monitoring — repeated upheld claims lead to suspension"]} />
            </div>
            <ButtonLink href="/verification" variant="secondary" className="mt-8">
              How verification works
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* 9 · Quote comparison */}
      <section className="container-page py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <SectionHeading eyebrow="Quote comparison" title="See the full cost, not just the unit price." description="Manufacturers itemise every fee, so you can compare the real total, lead time and terms — then message or select your preferred supplier." />
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <caption className="sr-only">Example quote comparison</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted uppercase">
                  <th className="px-4 py-3 font-semibold">Example</th>
                  <th className="px-4 py-3 font-semibold">Manufacturer A</th>
                  <th className="px-4 py-3 font-semibold">Manufacturer B</th>
                </tr>
              </thead>
              <tbody className="tabular divide-y divide-line">
                {[
                  ["Unit price × 500", "Quoted", "Quoted"],
                  ["Setup / digitising", "Itemised", "Itemised"],
                  ["Sample", "Policy stated", "Policy stated"],
                  ["Shipping to you", "Estimated", "Estimated"],
                  ["Production time", "Days after proof", "Days after proof"],
                  ["Verification", "✓ Verified", "✓ Verified"],
                ].map((r) => (
                  <tr key={r[0]}>
                    {r.map((c, i) => (
                      <td key={i} className={i === 0 ? "px-4 py-3 font-medium" : "px-4 py-3 text-muted"}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Seller teaser */}
      <section className="container-page pb-4">
        <div className="card grid gap-6 p-8 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-navy text-cyan">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-semibold">Manufacture patches? Get matched with buyers who are already looking.</h2>
              <p className="mt-1 text-sm text-muted">No subscription. Pay only for qualified RFQs you choose to unlock — price shown before purchase.</p>
            </div>
          </div>
          <ButtonLink href="/become-a-seller" variant="dark">
            Apply as a manufacturer <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </section>

      {/* 10 · FAQ */}
      <FaqSection faqs={BUYER_FAQS} />

      {/* 11 · Final CTA */}
      <CtaBand title="Get free custom patch quotes." body="Tell us about your patch in a few minutes. We'll match you with verified manufacturers." primary={{ label: "Get Free Custom Patch Quotes", href: "/get-quotes" }} secondary={{ label: "How it works", href: "/how-it-works" }} />
    </>
  );
}
