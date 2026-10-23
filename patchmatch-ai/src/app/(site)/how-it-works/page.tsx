import type { Metadata } from "next";
import { Eye, EyeOff, FileCheck2, Handshake, Lock, MailCheck, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { CtaBand, FaqSection, MarketingHero, ProcessSteps, SectionHeading } from "@/components/marketing/sections";
import { BUYER_FAQS } from "@/content/faqs";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "How PatchMatch AI Works", description: "Submit your patch requirements, we verify and match them with verified manufacturers, and you compare itemised quotes. Free for buyers.", alternates: { canonical: "/how-it-works" } };

export default function HowItWorksPage() {
  return (
    <>
      <MarketingHero eyebrow="How it works" title="A sourcing process built around your privacy." description="You describe the patch once. We verify, qualify and match it. Verified manufacturers quote. You choose — and agree terms directly with them.">
        <ButtonLink href="/get-quotes" size="lg">Get free quotes</ButtonLink>
      </MarketingHero>
      <section className="container-page py-20">
        <SectionHeading eyebrow="For buyers" title="Six stages, fully transparent." />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { i: FileCheck2, t: "1. Submit your request", b: "Patch type, size, quantity, backing, artwork, timeline and budget in a guided form." },
            { i: MailCheck, t: "2. Verify your email", b: "We only process verified requests — it keeps spam out and manufacturers' trust high." },
            { i: Sparkles, t: "3. Review & qualification", b: "Automated checks plus a human reviewer confirm the request is complete. We may ask clarifying questions." },
            { i: ShieldCheck, t: "4. Matching", b: "Manufacturers must pass hard filters (verified, right patch type, MOQ, shipping, deadline). Eligible ones are ranked by a transparent score." },
            { i: EyeOff, t: "5. Anonymised preview", b: "Matched manufacturers see your specs with no name, email, phone, exact address or legible artwork." },
            { i: Handshake, t: "6. Quotes & selection", b: "An approved manufacturer receives the details you consented to share and sends an itemised quote." },
          ].map((s) => (
            <div key={s.t} className="card p-6">
              <s.i className="h-6 w-6 text-electric" />
              <h3 className="mt-4 font-semibold">{s.t}</h3>
              <p className="mt-1.5 text-sm text-muted">{s.b}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-surface py-20">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div className="card p-6">
            <p className="flex items-center gap-2 font-semibold"><Eye className="h-5 w-5 text-muted" /> What manufacturers see before purchase</p>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              <li>✓ Patch type, size, quantity, backing, colours, finishes</li>
              <li>✓ Destination state/region and deadline</li>
              <li>✓ Budget range if you shared one</li>
              <li>✓ A blurred, metadata-free artwork preview</li>
              <li>✗ Your name, company, email, phone, website, ZIP code</li>
            </ul>
          </div>
          <div className="card p-6">
            <p className="flex items-center gap-2 font-semibold"><Lock className="h-5 w-5 text-electric" /> After a verified purchase</p>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              <li>✓ Full specifications and original artwork</li>
              <li>✓ Contact details — only if you chose to share them</li>
              <li>✓ On-platform messaging either way</li>
              <li>✓ Every disclosure is logged</li>
              <li>✓ By default, only one manufacturer can purchase access</li>
            </ul>
          </div>
        </div>
      </section>
      <section className="container-page py-20">
        <SectionHeading eyebrow="For manufacturers" title="How sellers participate" />
        <div className="mt-10">
          <ProcessSteps steps={[
            { title: "Apply & verify", body: "Company details, capabilities, documents, factory photos and samples — reviewed by our team." },
            { title: "Get matched", body: "Receive anonymised opportunities that fit your patch types, MOQ, capacity and shipping." },
            { title: "Unlock", body: "Pay the published fee to access a qualified RFQ. No subscription." },
            { title: "Quote", body: "Send an itemised quotation and message the buyer." },
          ]} />
        </div>
        <p className="mt-10 flex items-start gap-2 text-sm text-muted"><Scale className="h-4 w-4 shrink-0" /> An RFQ is a buying opportunity, not a guaranteed order. PatchMatch AI is not a party to manufacturing agreements.</p>
      </section>
      <FaqSection faqs={BUYER_FAQS} />
      <CtaBand title="Start your request" primary={{ label: "Get free quotes", href: "/get-quotes" }} secondary={{ label: "Become a seller", href: "/become-a-seller" }} />
    </>
  );
}
