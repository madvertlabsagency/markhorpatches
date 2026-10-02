import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { Container, Section, SectionHeader } from "@/components/ui/Section";
import { SizeCompare } from "@/components/forms/SizeCompare";
import { FinalCTA } from "@/components/home/sections";

export const metadata: Metadata = pageMetadata({ title: "Patch Size Guide & Visualizer | Patch Gorilla", description: "Compare 2\" to 5\" custom patch sizes side by side and learn how patch sizing is quoted.", path: "/size-guide" });

export default function SizeGuidePage() {
  return (
    <>
      <PageHero eyebrow="Size guide" title={<>Find your <span className="text-gradient">size.</span></>} description='Patch size is quoted as the average of width and height. A 3" × 2" patch is quoted as 2.5" — but we still make your exact dimensions.' crumbs={[{ name: "Size guide", path: "/size-guide" }]} />
      <Section tone="light" className="py-16 sm:py-20"><Container><SectionHeader title="Compare sizes" className="mb-8" /><SizeCompare /></Container></Section>
      <Section tone="white" className="py-16">
        <Container size="lg">
          <div className="overflow-hidden rounded-[1.5rem] ring-1 ring-line">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Common placements and sizes</caption>
              <thead className="bg-navy text-white"><tr><th scope="col" className="px-5 py-3">Placement</th><th scope="col" className="px-5 py-3">Typical size</th></tr></thead>
              <tbody>
                {[["Hat front", '2" – 3" wide'], ["Hat side", '1.5" – 2"'], ["Left chest", '2.5" – 3.5"'], ["Sleeve / shoulder", '2.5" – 3.5"'], ["Jacket front", '3.5" – 5"'], ["Jacket back", '8" – 12"'], ["Backpack", '3" – 4"']].map(([a, b]) => (
                  <tr key={a} className="border-t border-line"><th scope="row" className="px-5 py-3 font-semibold">{a}</th><td className="px-5 py-3 text-slate">{b}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </Section>
      <FinalCTA />
    </>
  );
}
