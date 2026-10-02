import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";
import { Container } from "@/components/ui/Section";
import { PatchFinder } from "@/components/forms/PatchFinder";
import { Crown } from "@/components/brand/marks";

export const metadata: Metadata = pageMetadata({ title: "Patch Finder — Which Patch Type Is Right for You? | Patch Gorilla", description: "Answer six quick questions and get a custom patch recommendation: embroidered, woven, PVC, chenille, leather, printed or 3D puff.", path: "/patch-finder" });

export default async function PatchFinderPage() {
  const { catalog } = await getCatalog();
  const types = Object.fromEntries(catalog.patchTypes.map((p) => [p.code, { name: p.name, slug: p.slug, shortDescription: p.shortDescription }]));
  return (
    <section data-header-theme="dark" className="theme-dark relative min-h-screen overflow-hidden pb-24 pt-[calc(var(--header-h)+2.5rem)]">
      <div className="grid-texture-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <Container size="lg" className="relative">
        <div className="mb-3 flex items-center gap-3"><Crown className="h-6 text-turquoise" /><span className="eyebrow text-white/70">Patch finder</span></div>
        <h1 className="display text-[clamp(3rem,8vw,6rem)]">Find your <span className="text-gradient">patch.</span></h1>
        <p className="mb-10 mt-4 max-w-xl text-lg text-white/75">Six questions. One honest recommendation. You can always choose a different style.</p>
        <PatchFinder types={types} />
      </Container>
    </section>
  );
}
