import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PATCH_TYPES, patchTypeBySlug, BACKINGS, labelFor, INTENDED_USES } from "@/lib/catalog";
import { PatchArt } from "@/components/brand/PatchArt";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/primitives";
import { CheckList, CtaBand, FaqSection, MarketingHero, SectionHeading } from "@/components/marketing/sections";

export const dynamicParams = false;
export function generateStaticParams() {
  return PATCH_TYPES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = patchTypeBySlug((await params).slug);
  return p ? { title: `Custom ${p.name}`, description: `${p.short} Get free quotes for custom ${p.name.toLowerCase()} from verified manufacturers.`, alternates: { canonical: `/patch-types/${p.slug}` } } : {};
}

export default async function PatchTypePage({ params }: { params: Promise<{ slug: string }> }) {
  const p = patchTypeBySlug((await params).slug);
  if (!p) notFound();
  const others = PATCH_TYPES.filter((x) => x.code !== p.code).slice(0, 3);
  return (
    <>
      <MarketingHero
        eyebrow="Patch type"
        title={`Custom ${p.name.toLowerCase()}`}
        description={p.description}
        art={
          <div className="grid grid-cols-2 gap-5">
            <PatchArt type={p.code} className="animate-float [--r:-5deg]" />
            <PatchArt type={p.code} shape="circle" className="mt-12 animate-float [--r:4deg] [animation-delay:-3s]" />
          </div>
        }
      >
        <ButtonLink href={`/get-quotes?type=${p.code}`} size="lg">
          Get {p.name.toLowerCase().replace(" patches", "")} patch quotes <ArrowRight className="h-4 w-4" />
        </ButtonLink>
      </MarketingHero>

      <section className="container-page grid gap-14 py-20 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Manufacturing" title="How they're made" />
          <ol className="mt-8 space-y-4">
            {p.howItsMade.map((s, i) => (
              <li key={s} className="flex gap-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-navy font-display text-sm font-bold text-cyan">{i + 1}</span>
                <p className="pt-1 text-[15px] text-fg/85">{s}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="space-y-10">
          <div>
            <h2 className="text-xl font-semibold">Common applications</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {p.applications.map((a) => (
                <Badge key={a} tone="blue">
                  {a}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Available backings</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {p.backings.map((b) => (
                <li key={b} className="card px-4 py-3 text-sm">
                  <span className="font-semibold">{labelFor(BACKINGS, b)}</span>
                  <span className="block text-muted">{BACKINGS.find((x) => x.code === b)?.hint}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-surface py-20">
        <div className="container-page grid gap-12 lg:grid-cols-2">
          <SectionHeading eyebrow="Before you order" title="Production considerations" description="Prices and lead times vary by manufacturer and specification — you'll see them in itemised quotes." />
          <CheckList items={p.considerations} />
        </div>
      </section>

      <section className="container-page py-20">
        <SectionHeading eyebrow="Popular for" title="Use cases" />
        <div className="mt-6 flex flex-wrap gap-2">
          {INTENDED_USES.filter((u) => u.slug).map((u) => (
            <a key={u.code} href={`/custom-patches/${u.slug}`} className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-electric/40">
              {u.label}
            </a>
          ))}
        </div>
        <h2 className="mt-16 text-xl font-semibold">Compare other types</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {others.map((o) => (
            <a key={o.code} href={`/patch-types/${o.slug}`} className="card flex items-center gap-4 p-4 hover:border-electric/40">
              <div className="w-14">
                <PatchArt type={o.code} />
              </div>
              <div>
                <p className="font-semibold">{o.name}</p>
                <p className="text-sm text-muted">{o.short}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
      <FaqSection faqs={p.faqs} title={`${p.name}: FAQ`} />
      <CtaBand title={`Get quotes for ${p.name.toLowerCase()}`} body="Free for buyers. Matched with verified manufacturers." primary={{ label: "Start request", href: `/get-quotes?type=${p.code}` }} />
    </>
  );
}
