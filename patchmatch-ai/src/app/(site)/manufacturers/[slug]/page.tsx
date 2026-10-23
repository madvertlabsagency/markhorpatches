import type { Metadata } from "next";
import { VerificationBadge } from "@/components/seller/VerificationBadge";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock, Globe2, MapPin, Package, Truck } from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge, Card, CardHeader, KeyValue } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { countryName, patchTypeName, BACKINGS, labelFor } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  return prisma.sellerProfile.findFirst({
    where: { publicSlug: slug, verificationStatus: "VERIFIED" },
    include: { capabilities: true, portfolio: { where: { isPublic: true }, take: 12 }, reviews: { where: { published: true }, take: 10, orderBy: { createdAt: "desc" } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = await load((await params).slug);
  return s ? { title: `${s.tradingName ?? s.legalName} — Verified Patch Manufacturer`, description: `${s.tradingName ?? s.legalName} in ${countryName(s.country)}. Capabilities: ${s.capabilities.map((c) => patchTypeName(c.patchType)).join(", ")}.` } : {};
}

export default async function ManufacturerProfile({ params }: { params: Promise<{ slug: string }> }) {
  const s = await load((await params).slug);
  if (!s) notFound();
  const [unlocks, quotes] = await Promise.all([prisma.rfqUnlock.count({ where: { sellerId: s.id, status: "ACTIVE" } }), prisma.quote.count({ where: { sellerId: s.id, submittedAt: { not: null } } })]);
  // Performance metrics are shown only with enough real platform data.
  const showPerformance = unlocks >= 10 && s.avgResponseMinutes != null;
  const avgRating = s.reviews.length >= 3 ? s.reviews.reduce((a, r) => a + r.rating, 0) / s.reviews.length : null;
  return (
    <div className="container-page py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Manufacturer profile</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{s.tradingName ?? s.legalName}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
            <VerificationBadge seller={s} showMeaning />
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {countryName(s.country)}</span>
            {s.yearsOperating != null && <span>· {s.yearsOperating} years operating</span>}
            {s.isDemo && <Badge tone="violet">Fictional demo profile</Badge>}
          </div>
        </div>
        <ButtonLink href="/get-quotes">Request quotes</ButtonLink>
      </div>
      {s.description && <p className="mt-6 max-w-3xl text-muted">{s.description}</p>}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Manufacturing capabilities" description="Declared by the manufacturer and reviewed during verification." />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-left text-xs text-muted uppercase"><tr><th className="px-5 py-2">Type</th><th className="px-5 py-2">MOQ</th><th className="px-5 py-2">Standard</th><th className="px-5 py-2">Rush</th><th className="px-5 py-2">Typical unit range</th></tr></thead>
              <tbody className="tabular divide-y divide-line">
                {s.capabilities.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-2.5 font-medium">{patchTypeName(c.patchType)}</td>
                    <td className="px-5 py-2.5">{c.moq.toLocaleString()}</td>
                    <td className="px-5 py-2.5">{c.standardDays} days</td>
                    <td className="px-5 py-2.5">{c.rushDays ? `${c.rushDays} days` : "—"}</td>
                    <td className="px-5 py-2.5">{c.priceMinMinor != null && c.priceMaxMinor != null ? `${formatMoney(c.priceMinMinor)}–${formatMoney(c.priceMaxMinor)}` : "On quote"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="p-5">
          <KeyValue cols={1} items={[
            { label: "Backings", value: s.backingOptions.map((b) => labelFor(BACKINGS, b)).join(", ") || "—" },
            { label: "Ships to", value: <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" />{s.shippingCountries.map(countryName).join(", ") || "—"}</span> },
            { label: "Export markets", value: <span className="flex items-center gap-1"><Globe2 className="h-3.5 w-3.5" />{s.exportMarkets.map(countryName).join(", ") || "—"}</span> },
            { label: "Samples", value: <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{s.sampleCapable ? "Available" : "Not offered"}</span> },
            { label: "Platform performance", value: showPerformance ? <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Avg. quote time {Math.round(s.avgResponseMinutes! / 60)}h · {quotes} quotes sent</span> : "Not enough platform history yet" },
            { label: "Buyer reviews", value: avgRating ? `${avgRating.toFixed(1)} / 5 from ${s.reviews.length} verified buyers` : "No reviews yet" },
            // Performance figures: demo databases carry fictional values (labelled); production shows them only once real order data exists.
            ...(s.isDemo && s.onTimeDeliveryPct != null ? [{ label: "On-time delivery (simulated)", value: `${s.onTimeDeliveryPct}%` }, { label: "Buyer satisfaction (simulated)", value: `${s.satisfactionPct ?? "—"}%` }, { label: "Completed orders (simulated)", value: s.completedOrders.toLocaleString() }] : []),
          ]} />
        </Card>
      </div>
      {s.portfolio.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Portfolio</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {s.portfolio.map((p) => (
              <figure key={p.id} className="card overflow-hidden">
                { }
                <img src={`/api/files/${p.attachmentId}?variant=preview`} alt={p.title} className="aspect-square w-full object-cover" loading="lazy" />
                <figcaption className="truncate px-2 py-1.5 text-xs text-muted">{p.title}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
