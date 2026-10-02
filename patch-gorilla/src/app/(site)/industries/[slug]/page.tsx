import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { getIndustry, INDUSTRIES } from "@/content/industries";
import { getCatalog } from "@/lib/catalog";
import { getGalleryItems } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { Container, Section, SectionHeader } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { PatchArt } from "@/components/brand/PatchArt";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { FinalCTA } from "@/components/home/sections";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return INDUSTRIES.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ind = getIndustry((await params).slug);
  return ind ? pageMetadata({ title: ind.seoTitle, description: ind.seoDescription, path: `/industries/${ind.slug}` }) : {};
}

export default async function IndustryPage({ params }: Props) {
  const ind = getIndustry((await params).slug);
  if (!ind) notFound();
  const [{ catalog }, gallery] = await Promise.all([getCatalog(), getGalleryItems({ industry: ind.slug })]);
  const byCode = Object.fromEntries(catalog.patchTypes.map((p) => [p.code, p]));
  return (
    <>
      <PageHero eyebrow={`Custom patches for ${ind.name.toLowerCase()}`} title={ind.headline} accent={ind.accent} description={ind.intro} crumbs={[{ name: "Industries", path: "/industries" }, { name: ind.name, path: `/industries/${ind.slug}` }]}>
        <div className="flex flex-col gap-3 sm:flex-row"><ButtonLink href="/free-mockup" size="lg" arrow>Get a free mockup</ButtonLink><ButtonLink href="/build-your-patch" size="lg" variant="outline-light">Build your patch</ButtonLink></div>
      </PageHero>
      <Section tone="white" className="py-16 sm:py-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <SectionHeader title="Popular uses" />
              <ul className="mt-6 space-y-3">{ind.uses.map((u) => <li key={u} className="flex items-center gap-3 text-lg"><Check className="h-5 w-5 text-electric" aria-hidden />{u}</li>)}</ul>
            </div>
            <div className="rounded-[var(--radius-patch)] bg-navy p-8 text-white">
              <h2 className="display text-4xl">Pro tips</h2>
              <ul className="mt-5 space-y-3">{ind.tips.map((t) => <li key={t} className="text-white/80">— {t}</li>)}</ul>
            </div>
          </div>
        </Container>
      </Section>
      <Section tone="ice" className="py-16 sm:py-24">
        <Container>
          <SectionHeader title="Recommended patch types" className="mb-10" />
          <div className="grid gap-5 md:grid-cols-3">
            {ind.recommended.filter((r) => byCode[r.code]).map((r) => (
              <Link key={r.code} href={`/${byCode[r.code].slug}`} className="group rounded-[var(--radius-patch)] bg-white p-6 shadow-lift ring-1 ring-navy/5 transition hover:-translate-y-1">
                <div className="w-20 transition-transform group-hover:-rotate-6"><PatchArt code={r.code} title="" /></div>
                <h3 className="display mt-4 text-3xl">{byCode[r.code].name}</h3>
                <p className="mt-2 text-slate">{r.why}</p>
              </Link>
            ))}
          </div>
        </Container>
      </Section>
      {gallery.length > 0 && (
        <Section tone="dark" className="py-16 sm:py-24"><Container size="2xl"><SectionHeader dark title="Recent work" className="mb-8" /><GalleryGrid items={gallery} dark filters={[]} /></Container></Section>
      )}
      <FinalCTA />
    </>
  );
}
