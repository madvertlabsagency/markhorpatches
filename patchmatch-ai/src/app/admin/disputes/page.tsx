import type { Metadata } from "next";
import { Scale } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data";
import { formatMoney } from "@/lib/money";
import { relativeTime } from "@/lib/utils";
import { statusTone } from "@/lib/ui-status";

export const metadata: Metadata = { title: "Disputes & quality claims" };

export default async function AdminDisputes() {
  await requireAdmin("disputes:decide");
  const disputes = await prisma.dispute.findMany({ include: { seller: { select: { legalName: true } }, unlock: { include: { rfq: { select: { publicRef: true } } } } }, orderBy: [{ status: "asc" }, { createdAt: "asc" }], take: 200 });
  return (
    <>
      <PageHeader title="Disputes & quality claims" description="Review evidence against the RFQ Quality Policy; decisions update the financial ledger." />
      <DataTable rows={disputes} rowKey={(d) => d.id} rowHref={(d) => `/admin/disputes/${d.id}`} empty={<EmptyState icon={Scale} title="No claims" />} columns={[
        { key: "s", header: "Seller", cell: (d) => d.seller.legalName }, { key: "r", header: "RFQ", cell: (d) => d.unlock.rfq.publicRef },
        { key: "w", header: "Reason", cell: (d) => d.reason.toLowerCase().replace(/_/g, " ") }, { key: "a", header: "Amount", cell: (d) => formatMoney(d.unlock.priceMinor), align: "right" },
        { key: "st", header: "Status", cell: (d) => <Badge tone={statusTone("dispute", d.status)}>{d.status.toLowerCase().replace("_", " ")}</Badge> }, { key: "t", header: "Filed", cell: (d) => relativeTime(d.createdAt) },
      ]} />
    </>
  );
}
