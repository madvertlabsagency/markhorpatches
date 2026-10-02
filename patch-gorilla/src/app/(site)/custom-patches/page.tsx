import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { getFaqs, getPatchCards, getProductBySlug } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { Container, Section, SectionHeader } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { PatchCard } from "@/components/product/PatchCard";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { BuilderTeaser } from "@/components/home/BuilderTeaser";
import { FAQSection, FinalCTA, GuaranteeSection } from "@/components/home/sections";
import { getSettings } from "@/lib/settings";
import { formatUSD } from "@/lib/money";

export async function generateMetadata(): Promise<Metadata> {
  const p = await getProductBySlug("custom-patches");
  return pageMetadata({ title: p?.seoTitle ?? "Custom Patches | Patch Gorilla", description: p?.seoDescription ?? undefined, path: "/custom-patches" });
}

const COMPARE: { label: string; values: Record<string, string> }[] = [
  { label: "Look & feel", values: { EMBROIDERED: "Raised thread", WOVEN: "Flat, fine", PVC: "Soft rubber", CHENILLE: "Fuzzy loops", LEATHER: "Debossed", PRINTED: "Full color", PUFF_3D: "Foam-raised" } },
  { label: "Fine detail", values: { EMBROIDERED: "Good", WOVEN: "Excellent", PVC: "Good", CHENILLE: "Low", LEATHER: "Good", PRINTED: "Excellent", PUFF_3D: "Low" } },
  { label: "Weatherproof", values: { EMBROIDERED: "—", WOVEN: "—", PVC: "Yes", CHENILLE: "—", LEATHER: "Partly", PRINTED: "—", PUFF_3D: "—" } },
  { label: "Gradients/photos", values: { EMBROIDERED: "—", WOVEN: "Limited", PVC: "—", CHENILLE: "—", LEATHER: "—", PRINTED: "Yes", PUFF_3D: "—" } },
];

export default async function CustomPatchesPage() {
  const [product, cards, { catalog, tables }, faqs, settings] = await Promise.all([getProductBySlug("custom-patches"), getPatchCards(), getCatalog(), getFaqs({ general: true }), getSettings()]);
  return (
    <>
      <PageHero eyebrow={product?.tagline ?? "Any design. Any style."} title={product?.h1 ?? "Custom Patches for Bold Brands"} description={product?.description} crumbs={[{ name: "Custom Patches", path: "/custom-patches" }]}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/build-your-patch" size="lg" arrow>Build your patch</ButtonLink>
          <ButtonLink href="/patch-finder" size="lg" variant="outline-light">Find my patch type</ButtonLink>
        </div>
      </PageHero>
      <Section tone="light" className="py-20 sm:py-28">
        <Container size="2xl">
          <SectionHeader eyebrow="Patch types" title="Seven styles. One standard." className="mb-12" />
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c, i) => <StaggerItem key={c.code}><PatchCard p={c} index={i} /></StaggerItem>)}
          </Stagger>
        </Container>
      </Section>
      <Section tone="white" className="py-20 sm:py-28">
        <Container size="2xl">
          <SectionHeader eyebrow="Compare" title="Side by side." className="mb-10" />
          <div className="overflow-x-auto rounded-[1.5rem] ring-1 ring-line" tabIndex={0} role="region" aria-label="Patch type comparison">
            <table className="w-full min-w-[820px] text-left">
              <thead className="bg-navy text-white">
                <tr>
                  <th scope="col" className="px-5 py-4" />
                  {cards.map((c) => <th key={c.code} scope="col" className="px-4 py-4 font-display text-lg font-extrabold uppercase">{c.name.replace(" Patches", "")}</th>)}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row) => (
                  <tr key={row.label} className="border-t border-line">
                    <th scope="row" className="px-5 py-3 text-sm font-semibold">{row.label}</th>
                    {cards.map((c) => <td key={c.code} className="px-4 py-3 text-sm text-slate">{row.values[c.code] ?? "—"}</td>)}
                  </tr>
                ))}
                <tr className="border-t border-line bg-ice">
                  <th scope="row" className="px-5 py-3 text-sm font-semibold">Starting at</th>
                  {cards.map((c) => <td key={c.code} className="px-4 py-3 font-display text-lg font-extrabold">{c.fromCents !== null ? `${formatUSD(c.fromCents)}/ea` : "—"}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </Container>
      </Section>
      <Section tone="ice" className="py-20 sm:py-28">
        <Container>
          <SectionHeader eyebrow="Instant pricing" title="Build your patch." accent="Your idea. Your rules." className="mb-10" />
          <BuilderTeaser catalog={catalog} tables={tables} />
        </Container>
      </Section>
      <GuaranteeSection headline={settings.promises.guaranteeHeadline} body={settings.promises.guaranteeBody} tagline={settings.promises.guaranteeTagline} />
      <FAQSection faqs={faqs.slice(0, 8)} />
      <FinalCTA />
    </>
  );
}
