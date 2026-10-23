import type { Metadata } from "next";
import { FileText, FilePlus2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireBuyer } from "@/lib/auth/session";
import { PageHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { DataTable, FilterBar, FilterSelect } from "@/components/ui/data";
import { ButtonLink } from "@/components/ui/Button";
import { RFQ_STATUS_LABEL } from "@/lib/state-machines";
import { statusTone } from "@/lib/ui-status";
import { patchTypeName } from "@/lib/catalog";
import { formatDate } from "@/lib/utils";
import type { Prisma, RfqStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "My RFQs" };

export default async function BuyerRfqs({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { user, org } = await requireBuyer();
  const sp = await searchParams;
  const where: Prisma.RfqWhereInput = {
    AND: [
      { OR: [{ buyerOrgId: org.id }, { buyerUserId: user.id }] },
      sp.status ? { status: sp.status as RfqStatus } : {},
      sp.q ? { OR: [{ publicRef: { contains: sp.q, mode: "insensitive" } }, { spec: { notes: { contains: sp.q, mode: "insensitive" } } }] } : {},
    ],
  };
  const rfqs = await prisma.rfq.findMany({ where, include: { spec: true, _count: { select: { quotes: { where: { status: { not: "DRAFT" } } } } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <PageHeader title="My RFQs" actions={<ButtonLink href="/get-quotes"><FilePlus2 className="h-4 w-4" /> New request</ButtonLink>} />
      <FilterBar action="/buyer/rfqs" q={sp.q} placeholder="Search by RFQ ID">
        <FilterSelect name="status" value={sp.status} label="Status" options={Object.entries(RFQ_STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
      </FilterBar>
      <DataTable
        rows={rfqs}
        rowKey={(r) => r.id}
        rowHref={(r) => `/buyer/rfqs/${r.id}`}
        empty={<EmptyState icon={FileText} title="No requests found" action={<ButtonLink href="/get-quotes">Start a request</ButtonLink>} />}
        columns={[
          { key: "ref", header: "RFQ", cell: (r) => <span className="tabular">{r.publicRef}</span> },
          { key: "what", header: "Patches", cell: (r) => `${r.spec?.quantity.toLocaleString()} × ${patchTypeName(r.patchType)}` },
          { key: "quotes", header: "Quotes", cell: (r) => r._count.quotes, align: "right" },
          { key: "date", header: "Submitted", cell: (r) => formatDate(r.createdAt), hideOnMobile: true },
          { key: "status", header: "Status", cell: (r) => <Badge tone={statusTone("rfq", r.status)}>{RFQ_STATUS_LABEL[r.status]}</Badge> },
        ]}
      />
    </>
  );
}
