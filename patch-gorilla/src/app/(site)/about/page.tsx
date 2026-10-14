import type { Metadata } from "next";
import Image from "next/image";
import { getSettings } from "@/lib/settings";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { Container, Section, SectionHeader } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { StickerBadge } from "@/components/brand/StickerBadge";
import { BrandStorySection, FinalCTA, GuaranteeSection, WhySection } from "@/components/home/sections";

export const metadata: Metadata = pageMetadata({ title: "About Markhor Patches", description: "About Markhor Patches: custom patches for brands that don’t follow the herd — transparent pricing, real proofs and human support.", path: "/about" });

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <>
      <PageHero eyebrow="About" title={<>Custom patches <span className="text-gradient">without the guesswork.</span></>} description="Ordering custom patches used to mean vague quotes, slow emails and surprises at delivery. We built Markhor Patches to fix that." crumbs={[{ name: "About", path: "/about" }]} />
      <Section tone="white" className="py-20 sm:py-28">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <SectionHeader title={<>Your artwork. <span className="text-gradient">Our craft.</span></>} description="We turn logos, sketches and big ideas into patches worth wearing — with a real designer on every order and a proof you approve before anything is made." />
              <p className="mt-6 text-lg leading-relaxed text-slate">Every order follows the same promise: you see a digital proof first, prices are visible before you commit, and nothing goes into production until you approve it.</p>
              <p className="mt-4 text-lg leading-relaxed text-slate">{s.promises.manufacturingStatement}</p>
            </Reveal>
            <Reveal className="relative">
              <Image src="/placeholders/macro-patches.webp" alt="Close-up of embroidered and woven custom patches showing thread texture" width={942} height={666} className="w-full rounded-[2rem]" />
              <StickerBadge variant="blue" rotate={-6} className="absolute -bottom-4 left-6 text-xl">Made to stand out.</StickerBadge>
            </Reveal>
          </div>
        </Container>
      </Section>
      <BrandStorySection />
      <WhySection />
      <GuaranteeSection headline={s.promises.guaranteeHeadline} body={s.promises.guaranteeBody} tagline={s.promises.guaranteeTagline} />
      <FinalCTA />
    </>
  );
}
