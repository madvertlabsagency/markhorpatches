import type { Metadata } from "next";
import { Check } from "lucide-react";
import { CtaBand, FaqSection, MarketingHero, SectionHeading } from "@/components/marketing/sections";
import { SELLER_FAQS } from "@/content/faqs";
import { RoiCalculator } from "@/components/marketing/RoiCalculator";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Seller Pricing — Pay per Qualified RFQ", description: "No subscription. Manufacturers pay a published fee only when they unlock a qualified RFQ.", alternates: { canonical: "/seller-pricing" } };
export const dynamic = "force-dynamic";

const TIERS = [
  { tier: "STANDARD", name: "Standard", fallback: 1500, desc: "Qualified request; may need some clarification (Tier B)." },
  { tier: "HIGH_INTENT", name: "High intent", fallback: 2000, desc: "Production-ready request with complete specs and strong intent (Tier A)." },
  { tier: "PREMIUM", name: "Premium", fallback: 2500, desc: "Tier A with large quantity or substantial budget." },
] as const;

export default async function SellerPricingPage() {
  const rules = await prisma.pricingRule.findMany({ where: { active: true, patchType: null, distributionMode: null } }).catch(() => []);
  const price = (t: string, fb: number) => rules.filter((r) => r.tier === t).sort((a, b) => b.priority - a.priority)[0]?.priceMinor ?? fb;
  return (
    <>
      <MarketingHero eyebrow="Seller pricing" title="Pay per qualified RFQ. Nothing else." description="No subscription, no listing fees, no commission on your orders. You see the price on every opportunity before you unlock it." />
      <section className="container-page py-20">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t, i) => (
            <div key={t.tier} className={i === 1 ? "card relative border-electric p-6 shadow-[var(--shadow-glow)]" : "card p-6"}>
              <p className="font-display text-sm font-semibold tracking-wide text-muted uppercase">{t.name}</p>
              <p className="tabular mt-3 font-display text-4xl font-semibold">{formatMoney(price(t.tier, t.fallback), "USD", { compact: true })}</p>
              <p className="text-sm text-muted">per unlock</p>
              <p className="mt-4 text-sm">{t.desc}</p>
            </div>
          ))}
          <div className="card p-6">
            <p className="font-display text-sm font-semibold tracking-wide text-muted uppercase">Enterprise</p>
            <p className="mt-3 font-display text-4xl font-semibold">Custom</p>
            <p className="text-sm text-muted">shown before unlock</p>
            <p className="mt-4 text-sm">Very large volumes (25,000+). Price set individually and displayed on the opportunity.</p>
          </div>
        </div>
        <ul className="mt-10 grid gap-3 text-sm sm:grid-cols-2">
          {["Price fixed when the opportunity is published", "Promotional discounts are shown, never hidden", "Daily unlock and spending caps you control", "Credits or refunds for upheld quality claims", "Prepaid credits via invoice during launch", "Receipts for every purchase"].map((x) => (
            <li key={x} className="flex gap-2"><Check className="h-4 w-4 text-success" /> {x}</li>
          ))}
        </ul>
      </section>
      <section className="bg-surface py-20">
        <div className="container-page">
          <SectionHeading eyebrow="ROI calculator" title="Model your own economics" description="Hypothetical — your results depend on your quoting, pricing and responsiveness." />
          <div className="mt-10"><RoiCalculator /></div>
        </div>
      </section>
      <FaqSection faqs={SELLER_FAQS} />
      <CtaBand title="Join as a verified manufacturer" primary={{ label: "Apply now", href: "/register?role=seller" }} />
    </>
  );
}
