import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { LiveBoard } from "@/components/live/LivePanels";

export const metadata: Metadata = {
  title: "Live marketplace",
  description: "Watch custom patch requests, manufacturer offers and new verified suppliers arrive on PatchMatch AI in real time.",
};

export default function LivePage() {
  return (
    <>
      <section className="bg-navy-hero text-white">
        <div className="container-page flex flex-wrap items-end justify-between gap-6 py-12">
          <div className="max-w-2xl">
            <p className="font-display text-xs font-semibold tracking-[0.28em] text-gold uppercase">The marketplace, right now</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Requests in. <span className="text-brand-gradient">Offers out.</span>
            </h1>
            <p className="mt-4 text-white/75">Every buyer request, manufacturer offer and new supplier application as it happens. Buyers stay anonymous — manufacturers see who they are only after a confirmed, consented purchase.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/get-quotes">Post a request <ArrowRight className="h-4 w-4" /></ButtonLink>
            <ButtonLink href="/become-a-seller" variant="outlineLight">Sell on PatchMatch</ButtonLink>
          </div>
        </div>
      </section>
      <div className="container-page py-10">
        <LiveBoard />
      </div>
    </>
  );
}
