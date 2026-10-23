import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Card, CardHeader, StatCard, Badge } from "@/components/ui/primitives";
import { BarChart } from "@/components/charts/BarChart";
import { DataTable } from "@/components/ui/data";
import { QUALIFICATION_RULES_VERSION } from "@/lib/rfq/qualification";
import { formatDateTime } from "@/lib/utils";
import { statusTone } from "@/lib/ui-status";

export const metadata: Metadata = { title: "Qualification" };

export default async function QualificationPage() {
  await requireAdmin("rfq:review");
  const [byTier, bySource, overrides, signals] = await Promise.all([
    prisma.rfqQualification.groupBy({ by: ["tier"], where: { isCurrent: true, rfq: { isDemo: false } }, _count: true }),
    prisma.rfqQualification.groupBy({ by: ["source"], where: { rfq: { isDemo: false } }, _count: true }),
    prisma.rfqQualification.findMany({ where: { source: "ADMIN" }, include: { rfq: { select: { id: true, publicRef: true } } }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.rfqQualificationSignal.groupBy({ by: ["code"], where: { qualification: { isCurrent: true, rfq: { isDemo: false } } }, _count: true, orderBy: { _count: { code: "desc" } }, take: 12 }),
  ]);
  const tierCount = (t: string) => byTier.find((x) => x.tier === t)?._count ?? 0;
  return (
    <>
      <PageHeader title="Qualification" description={`Deterministic rules ${QUALIFICATION_RULES_VERSION} + human review. Only Tier A/B with verified email are sellable.`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{["A", "B", "C", "D"].map((t) => <StatCard key={t} label={`Tier ${t}`} value={tierCount(t)} />)}</div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5"><BarChart title="Most frequent qualification signals (current)" data={signals.map((s) => ({ label: s.code.toLowerCase().replace(/_/g, " ").slice(0, 14), value: s._count }))} /></Card>
        <Card><CardHeader title="Decisions by source" /><ul className="divide-y divide-line text-sm">{bySource.map((s) => <li key={s.source} className="flex justify-between px-5 py-2.5"><span>{s.source.toLowerCase()}</span><span className="tabular">{s._count}</span></li>)}</ul></Card>
      </div>
      <Card className="mt-6"><CardHeader title="Recent reviewer decisions" />
        <DataTable rows={overrides} rowKey={(o) => o.id} rowHref={(o) => `/admin/rfq-review/${o.rfq.id}`} dense columns={[
          { key: "r", header: "RFQ", cell: (o) => o.rfq.publicRef }, { key: "t", header: "Tier", cell: (o) => <Badge tone={statusTone("tier", o.tier)}>{o.tier}</Badge> },
          { key: "n", header: "Reason", cell: (o) => (Array.isArray(o.reasons) ? (o.reasons as string[]).join("; ") : "—") }, { key: "d", header: "When", cell: (o) => formatDateTime(o.createdAt) },
        ]} />
      </Card>
    </>
  );
}
