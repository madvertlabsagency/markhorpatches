import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { PatchArt } from "@/components/brand/PatchArt";
import { CheckList, CtaBand, FaqSection, MarketingHero, ProcessSteps, SectionHeading } from "./sections";
import { QuickStart } from "./QuickStart";
import { PATCH_TYPES } from "@/lib/catalog";
import type { LandingContent } from "@/content/landing";

export function LandingTemplate({ c }: { c: LandingContent }) {
  return (
    <>
      <MarketingHero eyebrow={c.eyebrow} title={c.title} description={c.intro} art={<PatchArt type={c.heroArt} className="mx-auto w-64 animate-float [--r:-4deg]" />}>
        <div className="max-w-xl">
          <QuickStart tone="dark" />
        </div>
      </MarketingHero>
      <section className="container-page py-20">
        <SectionHeading eyebrow="Recommended constructions" title="What usually works best" description="Starting points, not rules — manufacturers advise on your specific design." />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {c.recommended.map((r, i) => {
            const info = PATCH_TYPES.find((p) => p.code === r.type)!;
            return (
              <Link key={r.type} href={`/patch-types/${info.slug}`} className="group card flex gap-4 p-5 transition hover:border-electric/40">
                <div className="w-20 shrink-0">
                  <PatchArt type={r.type} shape={(["shield", "circle", "rounded"] as const)[i % 3]} />
                </div>
                <div>
                  <p className="font-semibold">{info.name}</p>
                  <p className="mt-1 text-sm text-muted">{r.why}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-electric">
                    Details <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="bg-surface py-20">
        <div className="container-page grid gap-12 lg:grid-cols-2">
          <SectionHeading eyebrow="Before you request" title="Production considerations" />
          <CheckList items={c.considerations} />
        </div>
      </section>
      <section className="container-page py-20">
        <ProcessSteps
          steps={[
            { title: "Describe", body: "Type, size, quantity, backing and deadline." },
            { title: "Upload", body: "Artwork stays private; previews are blurred before unlock." },
            { title: "Verify & match", body: "We confirm your email and match verified manufacturers." },
            { title: "Compare", body: "Review itemised quotes and choose — or don't." },
          ]}
        />
        <div className="mt-10">
          <ButtonLink href={`/get-quotes${c.presetType ? `?type=${c.presetType}` : ""}`} size="lg">
            Start your request <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </section>
      <FaqSection faqs={c.faqs} />
      <CtaBand title="Ready to compare quotes?" primary={{ label: "Get free quotes", href: "/get-quotes" }} secondary={{ label: "How it works", href: "/how-it-works" }} />
    </>
  );
}
