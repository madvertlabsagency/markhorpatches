import type { Metadata } from "next";
import { ClipboardCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data";
import { patchTypeName } from "@/lib/catalog";
import { relativeTime } from "@/lib/utils";
import { statusTone } from "@/lib/ui-status";

export const metadata: Metadata = { title: "RFQ review" };

export default async function RfqReviewQueue() {
  await requireAdmin("rfq:review");
  const rfqs = await prisma.rfq.findMany({ where: { status: { in: ["UNDER_REVIEW", "VERIFICATION_PENDING"] } }, include: { spec: true, qualifications: { where: { isCurrent: true } } }, orderBy: { submittedAt: "asc" }, take: 200 });
  return (
    <>
      <PageHeader title="RFQ review queue" description="Oldest first. Verified RFQs need a qualification decision; unverified ones wait for the buyer." />
      <DataTable rows={rfqs} rowKey={(r) => r.id} rowHref={(r) => `/admin/rfq-review/${r.id}`} empty={<EmptyState icon={ClipboardCheck} title="Queue is clear" />} columns={[
        { key: "r", header: "RFQ", cell: (r) => <span className="tabular">{r.publicRef}</span> },
        { key: "w", header: "Request", cell: (r) => `${r.spec?.quantity.toLocaleString()} × ${patchTypeName(r.patchType)}` },
        { key: "t", header: "Tier", cell: (r) => (r.qualifications[0] ? <Badge tone={statusTone("tier", r.qualifications[0].tier)}>{r.qualifications[0].tier}</Badge> : "—") },
        { key: "s", header: "Scores C/I/R", cell: (r) => (r.qualifications[0] ? <span className="tabular text-xs">{r.qualifications[0].completenessScore}/{r.qualifications[0].intentScore}/{r.qualifications[0].fraudScore}</span> : "—"), hideOnMobile: true },
        { key: "v", header: "Email", cell: (r) => (r.emailVerifiedAt ? <Badge tone="green">verified</Badge> : <Badge tone="amber">pending</Badge>) },
        { key: "a", header: "Waiting", cell: (r) => relativeTime(r.submittedAt ?? r.createdAt) },
        { key: "d", header: "", cell: (r) => (r.isDemo ? <Badge tone="violet">demo</Badge> : null), hideOnMobile: true },
      ]} />
    </>
  );
}
