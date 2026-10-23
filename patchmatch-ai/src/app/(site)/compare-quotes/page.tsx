import type { Metadata } from "next";
import { CheckList, CtaBand, MarketingHero, ProcessSteps, SectionHeading } from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: "Compare custom patch quotes",
  description: "Compare itemised custom patch quotes side by side: unit price, setup, sample, shipping, lead time, inclusions and exclusions.",
  alternates: { canonical: "/compare-quotes" },
};

const ROWS: [string, string][] = [
  ["Unit price × quantity", "The base production cost for the quantity you asked for."],
  ["Setup / digitising", "One-off cost to prepare your artwork for production."],
  ["Sample & tooling", "Physical sample or PVC mould charges, if any."],
  ["Shipping to you", "Courier cost to your US destination."],
  ["Production & delivery time", "Days to produce after proof approval, plus transit."],
  ["Included backing", "Iron-on, sew-on, hook & loop or adhesive — as quoted."],
  ["Inclusions / exclusions", "What's covered (proofs, borders, packing) and what isn't (duties)."],
  ["Payment & revision terms", "Deposit terms and how many proof revisions are included."],
];

export default function CompareQuotesPage() {
  return (
    <>
      <MarketingHero eyebrow="Compare quotes" title="Compare the real total — not just the unit price." description="Every PatchMatch quote is itemised the same way, so you can line them up, ask for a revision, and choose with confidence. Quotes are free and you're never obliged to order." />
      <section className="container-page py-20">
        <SectionHeading eyebrow="What every quote shows" title="Same fields, every manufacturer." />
        <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-surface-2 text-xs tracking-wide text-muted uppercase"><tr><th className="px-4 py-3">Line</th><th className="px-4 py-3">What it means</th></tr></thead>
            <tbody className="divide-y divide-line">{ROWS.map(([k, v]) => <tr key={k}><td className="px-4 py-3 font-semibold">{k}</td><td className="px-4 py-3 text-muted">{v}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="bg-surface py-20">
        <div className="container-page grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="How comparison works" title="From request to decision." />
            <div className="mt-8">
              <ProcessSteps steps={[
                { title: "Opt in to comparison", body: "In the request form, allow up to three manufacturers to unlock your request (otherwise it's exclusive to one)." },
                { title: "Receive itemised quotes", body: "Manufacturers quote in the same structure, and can message you on the platform with questions." },
                { title: "Ask for a revision", body: "Request a change — size, backing, price or timing — and the manufacturer can send an updated quote." },
                { title: "Select or decline", body: "Choose one quote to start the project, or decline them all. Other manufacturers are notified politely." },
              ]} />
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="Tips" title="What to look for." />
            <div className="mt-8">
              <CheckList items={[
                "Compare the total including setup, sample and shipping — not only the unit price.",
                "Check the production time starts after proof approval.",
                "Ask for a digital proof before you pay a deposit.",
                "Confirm the backing suits your garment (iron-on rarely suits nylon or polyester).",
                "Review the manufacturer's badges: identity verified and capability reviewed.",
              ]} />
            </div>
          </div>
        </div>
      </section>
      <CtaBand title="Ready to compare?" body="Describe your patch once and receive quotes you can compare side by side." primary={{ label: "Get Free Patch Quotes", href: "/get-quotes" }} secondary={{ label: "Buyer protection & privacy", href: "/buyer-protection" }} />
    </>
  );
}
