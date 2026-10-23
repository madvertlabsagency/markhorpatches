import type { Metadata } from "next";
import { ShieldBan } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Badge, EmptyState, Card, CardHeader } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data";
import { formatDateTime, daysAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Fraud" };

export default async function FraudPage() {
  await requireAdmin("fraud:review");
  const [risky, ips, bounces] = await Promise.all([
    prisma.rfqQualification.findMany({ where: { isCurrent: true, OR: [{ fraudScore: { gte: 30 } }, { tier: "D" }] }, include: { rfq: { select: { id: true, publicRef: true, contactEmail: true, submitIp: true, status: true } }, signals: { where: { category: "fraud" } } }, orderBy: { fraudScore: "desc" }, take: 100 }),
    prisma.rfq.groupBy({ by: ["submitIp"], where: { createdAt: { gte: daysAgo(7) }, submitIp: { not: null } }, _count: true, having: { submitIp: { _count: { gt: 3 } } }, orderBy: { _count: { submitIp: "desc" } }, take: 20 }),
    prisma.dispute.count({ where: { reason: { in: ["SPAM_OR_FRAUD", "INVALID_CONTACT"] }, status: { in: ["RESOLVED_CREDIT", "RESOLVED_REFUND"] } } }),
  ]);
  return (
    <>
      <PageHeader title="Fraud signals" description="Automated flags for human review. Nothing here is auto-rejected except honeypot spam." />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <DataTable rows={risky} rowKey={(r) => r.id} rowHref={(r) => `/admin/rfq-review/${r.rfq.id}`} empty={<EmptyState icon={ShieldBan} title="No flagged RFQs" />} columns={[
          { key: "r", header: "RFQ", cell: (r) => r.rfq.publicRef },
          { key: "s", header: "Risk", cell: (r) => <span className="tabular font-semibold">{r.fraudScore}</span>, align: "right" },
          { key: "g", header: "Signals", cell: (r) => <div className="flex flex-wrap gap-1">{r.signals.map((s) => <Badge key={s.id} tone="red">{s.code.toLowerCase().replace(/_/g, " ")}</Badge>)}</div> },
          { key: "t", header: "Tier", cell: (r) => r.tier },
          { key: "d", header: "When", cell: (r) => formatDateTime(r.createdAt), hideOnMobile: true },
        ]} />
        <div className="space-y-6">
          <Card><CardHeader title="High-volume IPs (7 days)" /><ul className="divide-y divide-line text-sm">{ips.length === 0 && <li className="px-5 py-3 text-muted">None.</li>}{ips.map((i) => <li key={i.submitIp} className="flex justify-between px-5 py-2"><span className="tabular">{i.submitIp}</span><span>{i._count} RFQs</span></li>)}</ul></Card>
          <Card className="p-5 text-sm"><p className="font-semibold">Upheld spam/invalid-contact claims</p><p className="tabular mt-1 text-2xl font-semibold">{bounces}</p><p className="mt-1 text-xs text-muted">Each one is a qualification miss — review the signals that let it through.</p></Card>
        </div>
      </div>
    </>
  );
}
