import type { Metadata } from "next";
import Link from "next/link";
import { INDUSTRIES } from "@/content/industries";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { Container, Section } from "@/components/ui/Section";
import { PatchArt } from "@/components/brand/PatchArt";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { FinalCTA } from "@/components/home/sections";

export const metadata: Metadata = pageMetadata({ title: "Custom Patches by Industry | Markhor Patches", description: "Custom patches for streetwear, apparel brands, businesses, sports teams, clubs, schools, events and creators.", path: "/industries" });

export default function IndustriesPage() {
  return (
    <>
      <PageHero eyebrow="Industries" title={<>Made for people who <span className="text-gradient">wear their name.</span></>} crumbs={[{ name: "Industries", path: "/industries" }]} />
      <Section tone="light" className="py-16 sm:py-20">
        <Container size="2xl">
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {INDUSTRIES.map((ind) => (
              <StaggerItem key={ind.slug}>
                <Link href={`/industries/${ind.slug}`} className="group flex h-full flex-col rounded-[var(--radius-patch)] bg-white p-6 shadow-lift ring-1 ring-navy/5 transition hover:-translate-y-1">
                  <div className="w-16 transition-transform group-hover:-rotate-6"><PatchArt code={ind.recommended[0].code} title="" /></div>
                  <h2 className="display mt-5 text-4xl">{ind.name}</h2>
                  <p className="mt-2 flex-1 text-sm text-slate">{ind.headline}</p>
                  <span className="mt-4 font-semibold text-patch">Explore →</span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>
      <FinalCTA />
    </>
  );
}
