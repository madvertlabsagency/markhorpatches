import Link from "next/link";
import { Headphones, Palette, Receipt, ShieldCheck, Truck, FileCheck2 } from "lucide-react";
import { Container, Section, SectionHeader } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { Accordion } from "@/components/ui/Accordion";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { BrushUnderline, HornMark, HandArrow, HornDivider, MountainContours, Scribble } from "@/components/brand/marks";
import { LogoEmblem } from "@/components/brand/Logo";
import { StickerBadge } from "@/components/brand/StickerBadge";
import { PatchArt } from "@/components/brand/PatchArt";
import { JsonLd } from "@/components/JsonLd";
import { faqJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

const WHY = [
  { icon: Palette, title: "Free artwork support", body: "Not production-ready? That's our problem. Our designers prepare every file.", dark: true },
  { icon: FileCheck2, title: "Proof before production", body: "See it before we make it. Revise until it's right.", dark: false },
  { icon: Receipt, title: "Transparent pricing", body: "Real prices on the page. The builder uses the same engine as checkout.", dark: false },
  { icon: ShieldCheck, title: "Quality checked", body: "Every batch is checked against the spec you approved.", dark: true },
  { icon: Truck, title: "Tracked shipping", body: "Tracking on every order, straight to your inbox.", dark: true },
  { icon: Headphones, title: "Real human support", body: "Email or WhatsApp a patch expert — never a bot wall.", dark: false },
];

export function WhySection() {
  return (
    <Section tone="white" className="py-24 sm:py-32">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.4fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeader eyebrow="Why Markhor Patches" title={<>Custom patches <span className="text-gradient">without the guesswork.</span></>} description="Ordering custom patches shouldn't feel like a gamble. Every step is designed to remove surprises." />
            <Scribble className="mt-8 h-8 text-electric" />
          </div>
          <Stagger className="grid gap-4 sm:grid-cols-2">
            {WHY.map((w, i) => (
              <StaggerItem key={w.title} className={cn(i % 2 === 1 && "sm:translate-y-10")}>
                <div className={cn("stitched group h-full rounded-[var(--radius-patch)] p-7 transition-transform duration-500 hover:-translate-y-1", w.dark ? "bg-navy text-white" : "bg-ice text-navy")}>
                  <w.icon className={cn("h-8 w-8", w.dark ? "text-turquoise" : "text-patch")} aria-hidden />
                  <h3 className="mt-6 font-display text-3xl font-extrabold uppercase leading-none">{w.title}</h3>
                  <p className={cn("mt-3", w.dark ? "text-white/70" : "text-slate")}>{w.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Container>
    </Section>
  );
}

const AUDIENCE = [
  { name: "Streetwear", slug: "streetwear", code: "CHENILLE" },
  { name: "Apparel brands", slug: "apparel-brands", code: "LEATHER" },
  { name: "Businesses", slug: "businesses", code: "EMBROIDERED" },
  { name: "Sports teams", slug: "sports-teams", code: "CHENILLE" },
  { name: "Clubs", slug: "clubs", code: "WOVEN" },
  { name: "Schools", slug: "schools", code: "PUFF_3D" },
  { name: "Events", slug: "events", code: "PRINTED" },
  { name: "Creators", slug: "creators", code: "PVC" },
  { name: "Organizations", slug: "businesses", code: "WOVEN" },
];

export function AudienceSection() {
  return (
    <Section tone="ice" className="overflow-hidden py-24 sm:py-28">
      <Container>
        <SectionHeader eyebrow="Who we make for" title={<>Made for people <br className="hidden sm:block" />who <span className="text-gradient">wear their name.</span></>} accent="Big brand or brand new." />
        <ul className="mt-14 flex flex-wrap gap-3">
          {AUDIENCE.map((a, i) => (
            <Reveal as="li" key={a.name} delay={i * 0.04}>
              <a href={`/industries/${a.slug}`} className="group flex items-center gap-3 rounded-full bg-white py-2 pl-2 pr-6 shadow-lift ring-1 ring-navy/5 transition-all duration-300 hover:-translate-y-1 hover:bg-navy hover:text-white">
                <span className="w-12 transition-transform duration-500 group-hover:rotate-12"><PatchArt code={a.code} title="" /></span>
                <span className="display text-3xl sm:text-4xl">{a.name}</span>
              </a>
            </Reveal>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

export function GuaranteeSection({ headline, body, tagline }: { headline: string; body: string; tagline: string }) {
  return (
    <Section tone="dark" className="overflow-hidden py-24 sm:py-32">
      <div className="grid-texture-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-patch/30 blur-[140px]" aria-hidden />
      <MountainContours className="absolute inset-x-0 bottom-0 h-1/2 w-full text-turquoise/30" lines={7} />
      <Container size="lg" className="relative text-center">
        <Reveal>
          <HornMark className="mx-auto h-14 text-turquoise" />
          <h2 className="display mt-6 text-[clamp(3rem,8vw,6.5rem)]">{headline}</h2>
          <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-white/75">{body}</p>
          <div className="mt-10 flex justify-center">
            <StickerBadge variant="blue" rotate={-3} className="px-6 py-3 text-3xl">{tagline}</StickerBadge>
          </div>
          <p className="mx-auto mt-10 max-w-lg text-sm text-white/50">Applies to differences from the approved production specification. See our <Link className="underline hover:text-turquoise" href="/refund-policy">refund &amp; remake policy</Link>.</p>
        </Reveal>
      </Container>
    </Section>
  );
}

export function FAQSection({ faqs, title = "Questions? Answered.", eyebrow = "FAQ", tone = "light" }: { faqs: { id: string; question: string; answer: string }[]; title?: string; eyebrow?: string; tone?: "light" | "white" }) {
  if (!faqs.length) return null;
  return (
    <Section tone={tone} className="py-24 sm:py-28">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.5fr]">
          <div>
            <SectionHeader eyebrow={eyebrow} title={title} />
            <p className="mt-6 text-slate">Can&apos;t find it? <Link href="/support" className="font-semibold text-patch underline-offset-4 hover:underline">Talk to a patch expert</Link>.</p>
          </div>
          <Accordion items={faqs.map((f) => ({ id: f.id, q: f.question, a: f.answer }))} />
        </div>
      </Container>
      <JsonLd data={faqJsonLd(faqs)} />
    </Section>
  );
}

export function FinalCTA() {
  return (
    <Section tone="navy" className="overflow-hidden py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(60%_80%_at_80%_20%,#0AD2F7_0%,transparent_60%),radial-gradient(50%_70%_at_10%_90%,#0A4AD6_0%,transparent_60%)]" aria-hidden />
      <div className="thread-noise pointer-events-none absolute inset-0" aria-hidden />
      <MountainContours className="absolute inset-0 h-full w-full text-turquoise/25" lines={8} />
      <div className="pointer-events-none absolute right-[5%] top-1/2 hidden w-60 -translate-y-1/2 opacity-90 lg:block xl:w-72">
        <LogoEmblem className="w-full drop-shadow-[0_20px_60px_rgb(10_116_245/.4)]" sizes="320px" />
      </div>
      <Container className="relative">
        <Reveal>
          <h2 className="display max-w-4xl text-[clamp(2.8rem,8vw,7rem)]">
            Your brand wasn&apos;t made to <span className="relative inline-block">
              <span className="text-gradient">blend in.</span>
              <BrushUnderline className="absolute -bottom-6 left-0 h-5" />
            </span>
          </h2>
          <div className="mt-8 flex items-center gap-3">
            <p className="hand -rotate-2 text-3xl text-turquoise">Ready to make yours?</p>
            <HandArrow direction="down-right" className="hidden h-12 w-12 text-turquoise sm:block" />
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Magnetic>
              <ButtonLink href="/free-mockup" size="lg" arrow className="w-full sm:w-auto">Get a free mockup</ButtonLink>
            </Magnetic>
            <ButtonLink href="/build-your-patch" size="lg" variant="outline-light">Build your patch</ButtonLink>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}

/** Editorial brand story. Concise on purpose — the design carries the meaning. */
export function BrandStorySection() {
  return (
    <Section tone="dark" className="overflow-hidden py-24 sm:py-36">
      <MountainContours className="absolute inset-0 h-full w-full text-electric/30" lines={11} />
      <div className="pointer-events-none absolute -left-40 top-1/3 h-[520px] w-[520px] rounded-full bg-patch/25 blur-[140px]" aria-hidden />
      <Container className="relative">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.1fr]">
          <Reveal className="relative mx-auto w-full max-w-sm lg:max-w-md">
            <div className="absolute inset-[12%] rounded-full bg-electric/25 blur-[70px]" aria-hidden />
            <LogoEmblem className="relative w-full" sizes="(min-width:1024px) 420px, 70vw" alt="The Markhor Patches emblem: spiralled Markhor horns around a mountain peak" />
          </Reveal>
          <div>
            <div className="mb-4 flex items-center gap-3"><HornMark className="h-6 text-turquoise" /><span className="eyebrow text-white/70">Our name</span></div>
            <h2 className="display text-[clamp(2.8rem,7vw,5.2rem)]">Why <span className="text-gradient">Markhor?</span></h2>
            <div className="mt-6 max-w-xl space-y-4 text-lg leading-relaxed text-white/75">
              <p>The Markhor is unmistakable.</p>
              <p>Its iconic horns and ability to thrive where others cannot make it a fitting symbol for brands built to stand apart.</p>
              <p className="text-white">Markhor Patches exists for exactly those brands.</p>
            </div>
            <HornDivider className="mt-10 max-w-md" />
            <p className="display mt-8 text-[clamp(3.4rem,10vw,7.5rem)] leading-[0.82]">
              Don&apos;t<br />follow<br />the <span className="hand text-gradient inline-block -rotate-3 normal-case">herd.</span>
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
