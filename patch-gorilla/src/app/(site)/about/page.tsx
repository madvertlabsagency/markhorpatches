import type { Metadata } from "next";
import Image from "next/image";
import { getSettings } from "@/lib/settings";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { Container, Section, SectionHeader } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { StickerBadge } from "@/components/brand/StickerBadge";
import { FinalCTA, GuaranteeSection, WhySection } from "@/components/home/sections";

export const metadata: Metadata = pageMetadata({ title: "About Patch Gorilla", description: "Why we started Patch Gorilla: custom patches without the guesswork — transparent pricing, real proofs and human support.", path: "/about" });

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <>
      <PageHero eyebrow="About" title={<>Custom patches <span className="text-gradient">without the guesswork.</span></>} description="Ordering custom patches used to mean vague quotes, slow emails and surprises at delivery. We built Patch Gorilla to fix that." crumbs={[{ name: "About", path: "/about" }]} />
      <Section tone="white" className="py-20 sm:py-28">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <SectionHeader title="Why “Gorilla”?" description="Strength, confidence, and a name you won't forget. That's what we want your patches to feel like too — bold enough to wear, built well enough to last." />
              <p className="mt-6 text-lg leading-relaxed text-slate">Every order follows the same promise: you see a digital proof first, prices are visible before you commit, and nothing goes into production until you approve it.</p>
              <p className="mt-4 text-lg leading-relaxed text-slate">{s.promises.manufacturingStatement}</p>
            </Reveal>
            <Reveal className="relative">
              <Image src="/placeholders/macro-embroidered-p.webp" alt="Close-up of an embroidered Patch Gorilla logo patch" width={634} height={460} className="w-full rounded-[2rem]" />
              <StickerBadge variant="blue" rotate={-6} className="absolute -bottom-4 left-6 text-xl">Any design. Any style.</StickerBadge>
            </Reveal>
          </div>
        </Container>
      </Section>
      <WhySection />
      <GuaranteeSection headline={s.promises.guaranteeHeadline} body={s.promises.guaranteeBody} tagline={s.promises.guaranteeTagline} />
      <FinalCTA />
    </>
  );
}
