import type { Metadata } from "next";
import { PATCH_TYPES } from "@/lib/catalog";
import { MarketingHero, PatchTypeGrid, CtaBand } from "@/components/marketing/sections";
import { PatchArt } from "@/components/brand/PatchArt";

export const metadata: Metadata = { title: "Custom Patch Types Compared", description: "Embroidered, PVC, chenille, woven, sublimated, leather and printed patches — how they're made and what they're best for.", alternates: { canonical: "/patch-types" } };

export default function PatchTypesPage() {
  return (
    <>
      <MarketingHero eyebrow="Patch types" title="Choose the right construction." description="Each technique has strengths. Compare them below — or choose “Not sure” in your request and let manufacturers recommend." art={<PatchArt type="SUBLIMATED" shape="circle" className="mx-auto w-60 animate-float" />} />
      <section className="container-page py-16">
        <PatchTypeGrid />
        <div className="card mt-12 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Patch type comparison</caption>
            <thead className="border-b border-line bg-surface-2/60 text-left text-xs text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Best for</th>
                <th className="px-4 py-3">Watch out for</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PATCH_TYPES.map((p) => (
                <tr key={p.code}>
                  <td className="px-4 py-3 font-semibold">{p.name}</td>
                  <td className="px-4 py-3 text-muted">{p.applications.slice(0, 3).join(", ")}</td>
                  <td className="px-4 py-3 text-muted">{p.considerations[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <CtaBand title="Not sure which to choose?" body="Pick “Not sure” in the request — manufacturers will recommend a technique in their quotes." primary={{ label: "Get free quotes", href: "/get-quotes?type=NOT_SURE" }} />
    </>
  );
}
