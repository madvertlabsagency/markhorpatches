import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { Container, Section, SectionHeader } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { PROCESS } from "@/components/home/ProcessSteps";
import { Reveal } from "@/components/motion/Reveal";
import { ThreadLine } from "@/components/brand/marks";
import { FAQSection, FinalCTA, GuaranteeSection } from "@/components/home/sections";
import { getFaqs } from "@/lib/data/public";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = pageMetadata({ title: "How Custom Patch Ordering Works | Patch Gorilla", description: "Upload, customize, approve your digital proof, and we produce, quality-check and ship. Nothing goes into production until you approve it.", path: "/how-it-works" });

const DETAIL = [
  "Upload a logo, sketch or photo — PNG, JPG, PDF, SVG, AI or EPS. Not production-ready? That's our problem.",
  "Choose patch type, size, quantity, shape, backing, border and extras in the builder. Prices update live from our real price list.",
  "A designer prepares a production-ready digital proof showing artwork, exact dimensions, thread colors and every specification.",
  "Approve it — or request changes as many times as you need. Every version is saved. Approved proofs are locked.",
  "We produce your patches with our specialist production partners and check every batch against the approved specification.",
  "Your patches ship with tracking. You get the tracking link by email and on your order page.",
];

export default async function HowItWorks() {
  const [faqs, settings] = await Promise.all([getFaqs({ general: true }), getSettings()]);
  return (
    <>
      <PageHero eyebrow="How it works" title={<>Custom patches <span className="text-gradient">without the guesswork.</span></>} description="Upload → Customize → Preview → Approve → We make it." crumbs={[{ name: "How it works", path: "/how-it-works" }]}>
        <ButtonLink href="/free-mockup" size="lg" arrow>Get a free mockup</ButtonLink>
      </PageHero>
      <Section tone="light" className="py-20 sm:py-28">
        <Container size="lg" className="relative">
          <ThreadLine vertical className="absolute bottom-0 left-[38px] top-0 hidden h-full sm:block" />
          <ol className="space-y-10">
            {PROCESS.map((s, i) => (
              <Reveal as="li" key={s.title} className="relative grid gap-4 sm:grid-cols-[80px_1fr]">
                <span className="bg-signature relative z-10 grid h-20 w-20 place-items-center rounded-3xl text-white shadow-glow"><s.icon className="h-8 w-8" aria-hidden /></span>
                <div className="rounded-[var(--radius-patch)] bg-white p-6 ring-1 ring-line">
                  <p className="eyebrow text-slate">Step {String(i + 1).padStart(2, "0")}</p>
                  <h2 className="display mt-2 text-4xl">{s.title}</h2>
                  <p className="mt-3 text-lg text-slate">{DETAIL[i]}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </Container>
      </Section>
      <Section tone="white" className="py-20">
        <Container><SectionHeader align="center" title="Nothing goes into production until you approve it." accent="See it before we make it." /></Container>
      </Section>
      <GuaranteeSection headline={settings.promises.guaranteeHeadline} body={settings.promises.guaranteeBody} tagline={settings.promises.guaranteeTagline} />
      <FAQSection faqs={faqs.filter((f) => f.category === "Mockups & proofs" || f.category === "Production & shipping")} />
      <FinalCTA />
    </>
  );
}
