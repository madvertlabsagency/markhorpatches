import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { getCatalog } from "@/lib/catalog";
import { allowedBackings, allowedBorders, allowedExtras, allowedShapes, titleShape } from "@/lib/configurator/rules";
import { startingUnitPrice } from "@/lib/pricing/engine";
import { getAggregateRating, getFaqs, getGalleryItems, getProductBySlug, getPublishedReviews } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/env";
import { formatUSD } from "@/lib/money";
import { PageHero } from "@/components/ui/PageHero";
import { Container, Section, SectionHeader } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { PatchArt } from "@/components/brand/PatchArt";
import { StickerBadge } from "@/components/brand/StickerBadge";
import { PriceCalculator } from "@/components/product/PriceCalculator";
import { PriceTable } from "@/components/product/PriceTable";
import { ProcessSteps } from "@/components/home/ProcessSteps";
import { VideoSection } from "@/components/home/VideoSection";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { ReviewCarousel } from "@/components/reviews/ReviewCarousel";
import { FAQSection, FinalCTA } from "@/components/home/sections";
import { Reveal } from "@/components/motion/Reveal";
import { JsonLd } from "@/components/JsonLd";

type Props = { params: Promise<{ productSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productSlug } = await params;
  const product = await getProductBySlug(productSlug);
  if (!product || !product.patchType) return {};
  return pageMetadata({ title: product.seoTitle ?? `${product.h1} | Patch Gorilla`, description: product.seoDescription ?? product.shortDescription, path: `/${product.slug}`, image: product.heroImageUrl ?? undefined });
}

const SIZE_PRESETS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 10, 12];

export default async function ProductPage({ params }: Props) {
  const { productSlug } = await params;
  const product = await getProductBySlug(productSlug);
  if (!product || !product.patchType) notFound(); // /custom-patches has its own route

  const [{ catalog, tables }, faqs, gallery, reviews, rating] = await Promise.all([
    getCatalog(),
    getFaqs({ productId: product.id }),
    getGalleryItems({ patchTypeId: product.patchTypeId! }),
    getPublishedReviews({ patchTypeId: product.patchTypeId! }),
    getAggregateRating(product.patchTypeId!),
  ]);
  const pt = catalog.patchTypes.find((p) => p.id === product.patchTypeId);
  if (!pt) notFound();
  const table = tables[pt.id];
  const from = startingUnitPrice(table);
  const maxPrice = table.cells.length ? Math.max(...table.cells.map((c) => c.unitPriceCents)) : null;
  const backings = allowedBackings(catalog, pt);
  const borders = allowedBorders(catalog, pt, null);
  const extras = allowedExtras(catalog, pt);
  const shapes = allowedShapes(pt);
  const sizes = SIZE_PRESETS.filter((s) => s >= pt.minSizeIn && s <= pt.maxSizeIn);
  const images = product.media.filter((m) => m.type === "IMAGE");

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.h1,
    description: product.shortDescription,
    brand: { "@type": "Brand", name: "Patch Gorilla" },
    category: "Custom patches",
    url: siteUrl(`/${product.slug}`),
    image: images.length ? images.map((m) => (m.url.startsWith("http") ? m.url : siteUrl(m.url))) : [siteUrl("/opengraph-image")],
    ...(from !== null && maxPrice !== null
      ? { offers: { "@type": "AggregateOffer", priceCurrency: "USD", lowPrice: (from / 100).toFixed(2), highPrice: (maxPrice / 100).toFixed(2), availability: "https://schema.org/InStock", url: siteUrl(`/${product.slug}`) } }
      : {}),
    // Only real, published, non-sample reviews ever produce a rating.
    ...(rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.ratingValue, reviewCount: rating.reviewCount } } : {}),
  };

  return (
    <>
      <PageHero
        eyebrow={product.tagline ?? product.name}
        title={product.h1}
        description={product.description}
        crumbs={[{ name: "Custom Patches", path: "/custom-patches" }, { name: product.name, path: `/${product.slug}` }]}
        aside={
          <div className="relative mx-auto w-full max-w-md">
            {images[0] ? (
              <div className="relative aspect-square overflow-hidden rounded-[2rem]">
                <Image src={images[0].url} alt={images[0].alt} fill priority sizes="(min-width:1024px) 40vw, 90vw" className="object-cover" />
              </div>
            ) : (
              <div className="animate-float [--r:-6deg]"><PatchArt code={pt.code} title={`${product.name} illustration`} /></div>
            )}
            {from !== null && (
              <StickerBadge variant="blue" rotate={-6} className="absolute -bottom-2 left-2 px-5 py-3 text-2xl">From {formatUSD(from)} / ea</StickerBadge>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={`/build-your-patch?type=${pt.code}`} size="lg" arrow>Build your patch</ButtonLink>
          <ButtonLink href={`/free-mockup?type=${pt.id}`} size="lg" variant="outline-light">Get a free mockup</ButtonLink>
        </div>
        <p className="mt-4 text-sm text-white/55">Minimum {pt.minQuantity} pcs · Ships in about {pt.productionDays} business days after approval</p>
      </PageHero>

      {/* What it is / best for / can reproduce */}
      <Section tone="white" className="py-20 sm:py-28">
        <Container>
          <div className="grid gap-10 lg:grid-cols-3">
            <Reveal>
              <h2 className="display text-5xl">What it is</h2>
              <p className="mt-4 text-lg leading-relaxed text-slate">{product.shortDescription}</p>
              <ul className="mt-6 space-y-2">
                {product.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 font-medium"><Check className="h-5 w-5 text-electric" aria-hidden />{h}</li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.1} className="stitched rounded-[var(--radius-patch)] bg-navy p-8 text-white">
              <h2 className="display text-4xl">Best for</h2>
              <ul className="mt-5 space-y-3">
                {product.bestFor.map((b) => <li key={b} className="flex gap-3 text-white/85"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-turquoise" />{b}</li>)}
              </ul>
            </Reveal>
            <Reveal delay={0.2} className="rounded-[var(--radius-patch)] bg-ice p-8">
              <h2 className="display text-4xl">Details it can reproduce</h2>
              <ul className="mt-5 space-y-3">
                {product.canReproduce.map((b) => <li key={b} className="flex gap-3 text-navy/85"><Check className="mt-0.5 h-5 w-5 shrink-0 text-patch" aria-hidden />{b}</li>)}
              </ul>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* Calculator */}
      <Section tone="ice" className="py-20 sm:py-28">
        <div className="grid-texture pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <Container className="relative">
          <SectionHeader eyebrow="Instant price" title={<>Price your <span className="text-gradient">{pt.shortName.toLowerCase()} patch.</span></>} accent="No email required." className="mb-10" />
          <PriceCalculator catalog={catalog} tables={tables} patchTypeId={pt.id} />
        </Container>
      </Section>

      {/* Options */}
      <Section tone="white" className="py-20 sm:py-28">
        <Container>
          <SectionHeader eyebrow="Options" title="Make it yours." description="Every option below is available for this patch type. Incompatible combinations are filtered out automatically in the builder." />
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <OptionBlock title="Available sizes">
              <div className="flex flex-wrap gap-2">{sizes.map((s) => <span key={s} className="rounded-full bg-ice px-4 py-2 font-display text-lg font-extrabold">{s}&quot;</span>)}</div>
              <p className="mt-3 text-sm text-slate">Custom sizes from {pt.minSizeIn}&quot; to {pt.maxSizeIn}&quot; (average of width and height). <Link href="/size-guide" className="font-semibold text-patch hover:underline">Size guide →</Link></p>
            </OptionBlock>
            <OptionBlock title="Shapes">
              <div className="flex flex-wrap gap-2">{shapes.map((s) => <span key={s} className="rounded-full bg-ice px-4 py-2 text-sm font-semibold">{titleShape(s)}</span>)}</div>
            </OptionBlock>
            <OptionBlock title="Backings">
              <ul className="divide-y divide-line">
                {backings.map((b) => (
                  <li key={b.id} className="flex justify-between gap-4 py-3"><span><span className="font-semibold">{b.name}</span><span className="block text-sm text-slate">{b.description}</span></span><span className="shrink-0 text-sm font-semibold text-patch">{b.modifierValue ? `+${formatUSD(b.modifierValue)}/ea` : "Included"}</span></li>
                ))}
              </ul>
            </OptionBlock>
            <OptionBlock title={borders.length ? "Borders" : "Edge"}>
              {borders.length ? (
                <ul className="divide-y divide-line">
                  {borders.map((b) => (
                    <li key={b.id} className="flex justify-between gap-4 py-3"><span><span className="font-semibold">{b.name}</span><span className="block text-sm text-slate">{b.description}</span></span><span className="shrink-0 text-sm font-semibold text-patch">{b.modifierValue ? `+${formatUSD(b.modifierValue)}/ea` : "Included"}</span></li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate">{pt.shortName} patches are molded with a clean, finished edge — no border choice needed.</p>
              )}
            </OptionBlock>
            {extras.length > 0 && (
              <OptionBlock title="Extras" className="lg:col-span-2">
                <ul className="grid gap-x-8 sm:grid-cols-2">
                  {extras.map((e) => (
                    <li key={e.id} className="flex justify-between gap-4 border-b border-line py-3"><span><span className="font-semibold">{e.name}</span><span className="block text-sm text-slate">{e.description}</span></span><span className="shrink-0 text-sm font-semibold text-patch">{e.modifierType === "PERCENT" ? `+${e.modifierValue / 100}%` : e.modifierType === "FIXED" ? `+${formatUSD(e.modifierValue)}` : `+${formatUSD(e.modifierValue)}/ea`}</span></li>
                  ))}
                </ul>
              </OptionBlock>
            )}
          </div>
        </Container>
      </Section>

      {gallery.length > 0 && (
        <Section tone="dark" className="py-20 sm:py-28">
          <Container size="2xl">
            <SectionHeader dark eyebrow="Gallery" title={<>{pt.shortName} in the <span className="text-gradient">wild.</span></>} className="mb-10" />
            <GalleryGrid items={gallery} dark filters={[]} />
          </Container>
        </Section>
      )}

      {product.videoUrl && (
        <Section tone="dark" className="pb-20 sm:pb-28">
          <Container><VideoSection videoUrl={product.videoUrl} posterUrl={product.videoPosterUrl ?? "/placeholders/macro-embroidered-p.webp"} title={`${product.name} close-up`} /></Container>
        </Section>
      )}

      {/* Pricing table */}
      <Section tone="light" className="py-20 sm:py-28">
        <Container>
          <SectionHeader eyebrow="Pricing" title={<>Transparent <span className="text-gradient">pricing.</span></>} description="The more you order, the less each patch costs." className="mb-10" />
          <PriceTable table={table} name={product.name} minSize={pt.minSizeIn} maxSize={pt.maxSizeIn} />
        </Container>
      </Section>

      <Section tone="white" className="py-20 sm:py-28">
        <Container size="2xl">
          <SectionHeader align="center" eyebrow="How it works" title="See it before we make it." className="mb-14" />
          <ProcessSteps />
        </Container>
      </Section>

      {reviews.length > 0 && (
        <Section tone="ice" className="py-20 sm:py-28">
          <Container size="2xl">
            <SectionHeader eyebrow="Reviews" title="What customers say." className="mb-10" />
            <ReviewCarousel reviews={reviews} />
          </Container>
        </Section>
      )}

      <FAQSection faqs={faqs} title={`${pt.shortName} patch FAQ`} />
      <FinalCTA />
      <JsonLd data={productLd} />
    </>
  );
}

function OptionBlock({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[var(--radius-patch)] border border-line bg-white p-6 sm:p-8 ${className ?? ""}`}>
      <h3 className="mb-4 font-display text-2xl font-extrabold uppercase">{title}</h3>
      {children}
    </div>
  );
}
