import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Radar } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireBuyer } from "@/lib/auth/session";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui/primitives";
import { countryName, patchTypeName } from "@/lib/catalog";

export const metadata: Metadata = { title: "Matches" };

/** Buyers see manufacturers approved to contact them (unlocked) — never the full candidate list. */
export default async function BuyerMatches() {
  const { user, org } = await requireBuyer("/buyer/matches");
  const rfqWhere = { OR: [{ buyerOrgId: org.id }, { buyerUserId: user.id }] };
  const [unlocks, pending] = await Promise.all([
    prisma.rfqUnlock.findMany({ where: { status: "ACTIVE", rfq: rfqWhere }, include: { seller: { include: { capabilities: true } }, rfq: { select: { id: true, publicRef: true, patchType: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.rfq.findMany({ where: { ...rfqWhere, status: { in: ["MATCHING", "SELLER_NOTIFIED", "MANUAL_SOURCING"] } }, include: { _count: { select: { matches: { where: { eligible: true } } } } } }),
  ]);
  return (
    <>
      <PageHeader title="Matches" description="Verified manufacturers approved to contact you about your requests." />
      {pending.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pending.map((r) => (
            <Link key={r.id} href={`/buyer/rfqs/${r.id}`} className="card flex items-center gap-3 p-4 hover:border-electric/40">
              <Radar className="h-5 w-5 text-electric" />
              <div className="text-sm"><p className="font-semibold">{r.publicRef}</p><p className="text-muted">{r.status === "MANUAL_SOURCING" ? "Manual sourcing in progress" : `${r._count.matches} eligible verified manufacturer(s)`}</p></div>
            </Link>
          ))}
        </div>
      )}
      {unlocks.length === 0 ? (
        <EmptyState icon={Radar} title="No manufacturers have been approved yet" description="When a verified manufacturer purchases access to one of your requests, they'll appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {unlocks.map((u) => (
            <Card key={u.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{u.seller.tradingName ?? u.seller.legalName}</p>
                <Badge tone="green"><BadgeCheck className="h-3 w-3" /> Verified</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">{countryName(u.seller.country)}{u.seller.yearsOperating ? ` · ${u.seller.yearsOperating} yrs` : ""}</p>
              <p className="mt-3 text-xs text-muted">Makes: {u.seller.capabilities.map((c) => patchTypeName(c.patchType)).join(", ")}</p>
              <div className="mt-4 flex gap-3 text-sm font-semibold">
                <Link href={`/buyer/rfqs/${u.rfq.id}#quotes`} className="text-electric">{u.rfq.publicRef}</Link>
                <Link href={`/manufacturers/${u.seller.publicSlug}`} className="text-electric">Profile</Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
