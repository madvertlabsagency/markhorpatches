import type { Metadata } from "next";
import { Store } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { DataTable, FilterBar, FilterSelect } from "@/components/ui/data";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { statusTone } from "@/lib/ui-status";
import type { OpportunityStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Opportunities" };

export default async function AdminOpportunities({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin("opportunity:manage");
  const sp = await searchParams;
  const opps = await prisma.opportunity.findMany({ where: sp.status ? { status: sp.status as OpportunityStatus } : {}, include: { rfq: { select: { id: true, publicRef: true, isDemo: true } } }, orderBy: { publishedAt: "desc" }, take: 200 });
  return (
    <>
      <PageHeader title="Opportunities" description="Published RFQ listings. Prices are fixed at publication." />
      <FilterBar action="/admin/opportunities"><FilterSelect name="status" value={sp.status} label="Status" options={["AVAILABLE", "PAUSED", "SOLD_OUT", "EXPIRED", "WITHDRAWN"].map((v) => ({ value: v, label: v.toLowerCase().replace("_", " ") }))} /></FilterBar>
      <DataTable rows={opps} rowKey={(o) => o.id} rowHref={(o) => `/admin/matching/${o.rfq.id}`} empty={<EmptyState icon={Store} title="No opportunities" />} columns={[
        { key: "r", header: "RFQ", cell: (o) => <>{o.rfq.publicRef}{o.rfq.isDemo && <Badge tone="violet" className="ml-1">demo</Badge>}</> },
        { key: "m", header: "Mode", cell: (o) => o.distributionMode.toLowerCase().replace("_", " ") },
        { key: "p", header: "Price", cell: (o) => formatMoney(o.priceMinor, o.currency), align: "right" },
        { key: "u", header: "Sold", cell: (o) => `${o.unlockCount}/${o.maxUnlocks}`, align: "right" },
        { key: "s", header: "Status", cell: (o) => <Badge tone={statusTone("opp", o.status)}>{o.status.toLowerCase().replace("_", " ")}</Badge> },
        { key: "d", header: "Published", cell: (o) => formatDate(o.publishedAt), hideOnMobile: true },
      ]} />
    </>
  );
}
