import type { Metadata } from "next";
import { BadgeCheck, Clock, ShieldCheck, Truck } from "lucide-react";
import { RfqWizard } from "@/components/rfq/RfqWizard";
import { wizardPrefill } from "@/app/actions/rfq";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Single-manufacturer quote funnel (for ad campaigns). Same verified request flow as /get-quotes,
 * but the request always goes to ONE verified manufacturing partner — the buyer's consent text says
 * so explicitly, and the server enforces maxRecipients = 1 for every "landing:" lead source.
 */
export const metadata: Metadata = {
  title: "Custom Patch Quote — Factory-Direct Pricing",
  description: "Embroidered, PVC, woven and chenille patches made to order. Tell us what you need and a verified manufacturer sends you a quote.",
  alternates: { canonical: "/quote" },
};

export default async function QuoteLandingPage({ searchParams }: { searchParams: Promise<{ type?: string; qty?: string }> }) {
  const sp = await searchParams;
  const [prefill, user] = await Promise.all([wizardPrefill(), getCurrentUser()]);
  return (
    <div className="bg-bg">
      <section className="bg-navy-hero relative overflow-hidden text-white">
        <img src="/photos/hero-patches.webp" alt="" aria-hidden className="pointer-events-none absolute top-0 right-0 hidden h-full w-[40%] object-cover opacity-30 [mask-image:linear-gradient(to_left,black,transparent)] md:block" />
        <div className="container-page relative py-12">
          <p className="font-display text-xs font-semibold tracking-[0.28em] text-gold uppercase">Custom patches · factory direct</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Get your custom patch quote <span className="text-brand-gradient">in hours, not weeks.</span>
          </h1>
          <p className="mt-4 max-w-xl text-white/75">Tell us about your patch and upload your logo. One verified manufacturing partner reviews it and contacts you directly with a quote and a free digital proof.</p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
            {[[BadgeCheck, "Verified manufacturer"], [Clock, "Quotes within hours"], [Truck, "Ships to all 50 states"], [ShieldCheck, "Your details go to one partner only"]].map(([I, t]) => {
              const Icon = I as typeof BadgeCheck;
              return <li key={t as string} className="flex items-center gap-2"><Icon className="h-4 w-4 text-orange" />{t as string}</li>;
            })}
          </ul>
        </div>
      </section>
      <div className="container-page py-10">
        <RfqWizard initialType={sp.type} initialQty={sp.qty} prefill={prefill} signedInEmail={user?.emailVerifiedAt ? user.email : null} leadSource="landing:custom-patch-quote" />
      </div>
    </div>
  );
}
