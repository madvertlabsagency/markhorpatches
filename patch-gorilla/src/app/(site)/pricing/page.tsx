import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";
import { formatUSD } from "@/lib/money";
import { PageHero } from "@/components/ui/PageHero";
import { Container, Section, SectionHeader } from "@/components/ui/Section";
import { PriceTable } from "@/components/product/PriceTable";
import { ButtonLink } from "@/components/ui/Button";
import { FinalCTA } from "@/components/home/sections";

export const metadata: Metadata = pageMetadata({
  title: "Custom Patch Pricing — Transparent Price List | Patch Gorilla",
  description: "See real per-patch prices for embroidered, PVC, woven, chenille, leather, printed and 3D puff patches by size and quantity. No hidden fees.",
  path: "/pricing",
});

export default async function PricingPage() {
  const { catalog, tables } = await getCatalog();
  return (
    <>
      <PageHero eyebrow="Pricing" title={<>Prices you can <span className="text-gradient">actually see.</span></>} accent="No “contact us for a quote” games." description="Every price on this page comes from the same price list the builder and checkout use. Pick a size and quantity — that's your price per patch, before optional backings and extras." crumbs={[{ name: "Pricing", path: "/pricing" }]}>
        <ButtonLink href="/build-your-patch" size="lg" arrow>Build &amp; price your patch</ButtonLink>
      </PageHero>
      <Section tone="white" className="py-12">
        <Container size="2xl">
          <nav aria-label="Jump to patch type" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {catalog.patchTypes.map((p) => (
              <a key={p.id} href={`#${p.slug}`} className="whitespace-nowrap rounded-full bg-ice px-4 py-2 text-sm font-semibold hover:bg-navy hover:text-white">{p.shortName}</a>
            ))}
          </nav>
        </Container>
      </Section>
      {catalog.patchTypes.map((p, i) => (
        <Section key={p.id} id={p.slug} tone={i % 2 ? "white" : "light"} className="scroll-mt-24 py-16 sm:py-20">
          <Container>
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <SectionHeader title={p.name} description={`${p.shortDescription} Minimum ${p.minQuantity} pcs.`} />
              <div className="flex gap-2">
                <ButtonLink href={`/${p.slug}`} variant="outline" size="sm">Details</ButtonLink>
                <ButtonLink href={`/build-your-patch?type=${p.code}`} size="sm" arrow>Customize</ButtonLink>
              </div>
            </div>
            <PriceTable table={tables[p.id]} name={p.name} minSize={p.minSizeIn} maxSize={p.maxSizeIn} />
          </Container>
        </Section>
      ))}
      <Section tone="ice" className="py-16">
        <Container>
          <SectionHeader title="Options & extras" className="mb-8" />
          <div className="grid gap-6 md:grid-cols-3">
            {[{ t: "Backings", rows: catalog.backings }, { t: "Borders", rows: catalog.borders }, { t: "Extras", rows: catalog.extras }].map((g) => (
              <div key={g.t} className="rounded-[var(--radius-patch)] bg-white p-6 ring-1 ring-line">
                <h3 className="font-display text-2xl font-extrabold uppercase">{g.t}</h3>
                <ul className="mt-4 divide-y divide-line">
                  {g.rows.map((r) => (
                    <li key={r.id} className="flex justify-between py-2.5 text-sm"><span>{r.name}</span><span className="font-semibold text-patch">{r.modifierType === "PERCENT" ? `+${r.modifierValue / 100}%` : r.modifierValue ? `+${formatUSD(r.modifierValue)}${r.modifierType === "PER_UNIT" ? "/ea" : ""}` : "Included"}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate">Shipping and any applicable sales tax are calculated at checkout. Questions? <Link href="/support" className="font-semibold text-patch hover:underline">Talk to a patch expert</Link>.</p>
        </Container>
      </Section>
      <FinalCTA />
    </>
  );
}
