import type { Metadata } from "next";
import { Radar } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { activeMatchingConfig } from "@/lib/domain/matching";
import { PageHeader, Badge, Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data";
import { MatchingConfigForm } from "@/components/admin/MatchingConfigForm";
import { patchTypeName } from "@/lib/catalog";
import { relativeTime } from "@/lib/utils";
import { RFQ_STATUS_LABEL } from "@/lib/state-machines";
import { statusTone } from "@/lib/ui-status";
import { MATCHING_ALGORITHM_VERSION } from "@/lib/matching/engine";

export const metadata: Metadata = { title: "Matching" };

export default async function MatchingPage() {
  await requireAdmin("matching:manage");
  const [rfqs, config] = await Promise.all([
    prisma.rfq.findMany({ where: { status: { in: ["QUALIFIED", "MATCHING", "MANUAL_SOURCING", "SELLER_NOTIFIED"] } }, include: { spec: true, _count: { select: { matches: { where: { eligible: true } } } }, opportunity: true }, orderBy: { qualifiedAt: "asc" }, take: 200 }),
    activeMatchingConfig(),
  ]);
  return (
    <>
      <PageHeader title="Matching" description={`Hard filters + weighted score (${MATCHING_ALGORITHM_VERSION}). AI explains; it never overrides eligibility.`} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <DataTable rows={rfqs} rowKey={(r) => r.id} rowHref={(r) => `/admin/matching/${r.id}`} empty={<EmptyState icon={Radar} title="Nothing awaiting matching" />} columns={[
          { key: "r", header: "RFQ", cell: (r) => r.publicRef },
          { key: "w", header: "Request", cell: (r) => `${r.spec?.quantity.toLocaleString()} × ${patchTypeName(r.patchType)}` },
          { key: "e", header: "Eligible", cell: (r) => r._count.matches, align: "right" },
          { key: "s", header: "Status", cell: (r) => <Badge tone={statusTone("rfq", r.status)}>{RFQ_STATUS_LABEL[r.status]}</Badge> },
          { key: "o", header: "Listing", cell: (r) => (r.opportunity ? <Badge tone={statusTone("opp", r.opportunity.status)}>{r.opportunity.status.toLowerCase().replace("_", " ")}</Badge> : <Badge>not published</Badge>), hideOnMobile: true },
          { key: "q", header: "Qualified", cell: (r) => (r.qualifiedAt ? relativeTime(r.qualifiedAt) : "—"), hideOnMobile: true },
        ]} />
        <Card>
          <CardHeader title={`Active configuration · ${config.version}`} description="Weights must sum to 100. Creates a new version; past matches keep theirs." />
          <div className="p-5"><MatchingConfigForm weights={config.weights} minScore={config.minScore} maxNotified={config.maxNotified} /></div>
        </Card>
      </div>
    </>
  );
}
