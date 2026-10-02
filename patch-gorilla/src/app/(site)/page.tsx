import type { Metadata } from "next";
import Link from "next/link";
import { Hero } from "@/components/home/Hero";
import { Marquee } from "@/components/home/Marquee";
import { BuilderTeaser } from "@/components/home/BuilderTeaser";
import { ProcessSteps } from "@/components/home/ProcessSteps";
import { VideoSection } from "@/components/home/VideoSection";
import { ArtworkToPatch } from "@/components/home/ArtworkToPatch";
import { AudienceSection, FAQSection, FinalCTA, GuaranteeSection, WhySection } from "@/components/home/sections";
import { PatchCard } from "@/components/product/PatchCard";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { ReviewCarousel } from "@/components/reviews/ReviewCarousel";
import { Container, Section, SectionHeader } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { HandArrow } from "@/components/brand/marks";
import { StickerBadge } from "@/components/brand/StickerBadge";
import { getCatalog } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { getFaqs, getGalleryItems, getPatchCards, getPublishedReviews } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Custom Patches for Bold Brands | Patch Gorilla",
  description: "Design custom embroidered, PVC, woven, chenille, leather, printed and 3D puff patches. Transparent pricing, free artwork support and a digital proof before production.",
  path: "/",
});

export default async function HomePage() {
  const [settings, cards, { catalog, tables }, gallery, reviews, faqs] = await Promise.all([
    getSettings(), getPatchCards(), getCatalog(), getGalleryItems({ featured: true, take: 12 }), getPublishedReviews({ take: 9 }), getFaqs({ home: true }),
  ]);
  const metrics = settings.trustMetrics.enabled ? settings.trustMetrics.items.filter((m) => m.value && m.label) : [];

  return (
    <>
      {/* 1 — Hero */}
      <Hero metrics={metrics} />

      {/* 2 — Marquee */}
      <Marquee />

      {/* 3 — Shop by patch type */}
      <Section tone="light" className="py-24 sm:py-32">
        <Container size="2xl">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <SectionHeader eyebrow="Shop by patch type" title={<>Pick your <span className="text-gradient">texture.</span></>} description="Seven ways to turn artwork into something you can hold. Every price below comes straight from our live price list." />
            <ButtonLink href="/patch-finder" variant="outline" arrow>Not sure? Take the quiz</ButtonLink>
          </div>
          <Stagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c, i) => (
              <StaggerItem key={c.code} className={i === 0 ? "lg:col-span-1" : ""}>
                <PatchCard p={c} index={i} />
              </StaggerItem>
            ))}
            <StaggerItem>
              <Link href="/custom-patches" className="group relative flex h-full min-h-72 flex-col justify-between overflow-hidden rounded-[var(--radius-patch)] bg-midnight p-7 text-white">
                <div className="grid-texture-dark absolute inset-0 opacity-50" aria-hidden />
                <p className="hand relative -rotate-3 text-2xl text-turquoise">Can&apos;t decide?</p>
                <p className="display relative text-5xl">Compare every patch type</p>
                <span className="relative font-semibold text-turquoise transition-transform group-hover:translate-x-1">See the full guide →</span>
              </Link>
            </StaggerItem>
          </Stagger>
        </Container>
      </Section>

      {/* 4 — Patch builder teaser */}
      <Section tone="ice" className="py-24 sm:py-32">
        <div className="grid-texture pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <Container className="relative">
          <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeader eyebrow="Instant pricing" title={<>Build your <span className="text-gradient">patch.</span></>} accent="Your idea. Your rules." />
            <p className="max-w-xs text-slate">25 or 2,500 — Gorilla doesn&apos;t judge. Prices update as you go.</p>
          </div>
          <BuilderTeaser catalog={catalog} tables={tables} />
        </Container>
      </Section>

      {/* 5 — Artwork to patch */}
      <Section tone="dark" className="overflow-hidden py-24 sm:py-32">
        <div className="grid-texture-dark pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <Container className="relative">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div>
              <SectionHeader dark eyebrow="Artwork to patch" title={<>From pixels <br />to <span className="text-gradient">patches.</span></>} description="Send a PNG, a PDF, a vector file — or a photo of a napkin sketch. Our designers translate it into thread, rubber, leather or print, then show you exactly how it will look." />
              <ul className="mt-8 space-y-3 text-white/80">
                {["Vector clean-up and digitizing included", "Thread colors matched to your brand", "You approve every detail before production"].map((t) => (
                  <li key={t} className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-turquoise" />{t}</li>
                ))}
              </ul>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <ButtonLink href="/free-mockup" arrow>Drop your art</ButtonLink>
                <span className="hand -rotate-2 text-xl text-turquoise">Napkin sketch? We&apos;ve seen worse.</span>
              </div>
            </div>
            <Reveal className="relative flex justify-center">
              <ArtworkToPatch />
              <HandArrow direction="curl" className="absolute -left-2 -top-8 hidden h-16 w-16 text-turquoise lg:block" />
              <StickerBadge variant="tape" rotate={5} className="absolute -bottom-4 right-6 text-base">Drag to compare</StickerBadge>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* 6 — How it works */}
      <Section tone="light" className="py-24 sm:py-32">
        <Container size="2xl">
          <SectionHeader align="center" eyebrow="How it works" title={<>Upload. Approve. <span className="text-gradient">We make it.</span></>} description="Nothing goes into production until you approve it." />
          <div className="mt-16"><ProcessSteps /></div>
          <div className="mt-12 text-center"><ButtonLink href="/how-it-works" variant="outline" arrow>See the full process</ButtonLink></div>
        </Container>
      </Section>

      {/* 7 — Product video / story */}
      <Section tone="dark" className="py-24 sm:py-32">
        <Container>
          <div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <SectionHeader dark eyebrow="Up close" title={settings.home.videoTitle} description={settings.home.videoDescription} />
          </div>
          <Reveal>
            <VideoSection videoUrl={settings.home.videoUrl} posterUrl={settings.home.videoPosterUrl} title={settings.home.videoTitle} />
          </Reveal>
        </Container>
      </Section>

      {/* 8 — Why */}
      <WhySection />

      {/* 9 — Who we make for */}
      <AudienceSection />

      {/* 10 — Gallery */}
      {gallery.length > 0 && (
        <Section tone="dark" className="py-24 sm:py-32">
          <Container size="2xl">
            <div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <SectionHeader dark eyebrow="Gallery" title={<>Built for <span className="text-gradient">bold brands.</span></>} />
              <ButtonLink href="/gallery" variant="outline-light" arrow>Full gallery</ButtonLink>
            </div>
            <GalleryGrid items={gallery} dark />
          </Container>
        </Section>
      )}

      {/* 11 — Reviews (database only — never fabricated) */}
      {reviews.length > 0 && (
        <Section tone="light" className="py-24 sm:py-32">
          <Container size="2xl">
            <div className="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <SectionHeader eyebrow="Reviews" title={<>In their <span className="text-gradient">words.</span></>} />
              <ButtonLink href="/reviews" variant="outline" arrow>All reviews</ButtonLink>
            </div>
            <ReviewCarousel reviews={reviews} />
          </Container>
        </Section>
      )}

      {/* 12 — Guarantee */}
      <GuaranteeSection headline={settings.promises.guaranteeHeadline} body={settings.promises.guaranteeBody} tagline={settings.promises.guaranteeTagline} />

      {/* 13 — FAQ */}
      <FAQSection faqs={faqs} />

      {/* 14 — Final CTA */}
      <FinalCTA />
    </>
  );
}
