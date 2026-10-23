import type { Metadata } from "next";
import { RotateCcw } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Refunds" };

export default async function AdminRefunds() {
  await requireAdmin("payments:view");
  const refunds = await prisma.refund.findMany({ include: { unlock: { include: { rfq: { select: { publicRef: true } }, seller: { select: { legalName: true } } } } }, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <PageHeader title="Refunds & credits" description="Credits go to the seller's prepaid balance; refunds go back to the original payment via the provider." />
      <DataTable rows={refunds} rowKey={(r) => r.id} empty={<EmptyState icon={RotateCcw} title="No refunds or credits" />} columns={[
        { key: "d", header: "When", cell: (r) => formatDateTime(r.createdAt) }, { key: "s", header: "Seller", cell: (r) => r.unlock.seller.legalName }, { key: "r", header: "RFQ", cell: (r) => r.unlock.rfq.publicRef },
        { key: "m", header: "Method", cell: (r) => <Badge tone={r.method === "CREDIT" ? "blue" : "violet"}>{r.method === "CREDIT" ? "credit" : "refund"}</Badge> },
        { key: "a", header: "Amount", cell: (r) => formatMoney(r.amountMinor, r.currency), align: "right" }, { key: "st", header: "Status", cell: (r) => r.status.toLowerCase() },
        { key: "why", header: "Reason", cell: (r) => <span className="text-xs text-muted">{r.reason}</span>, hideOnMobile: true },
      ]} />
    </>
  );
}
