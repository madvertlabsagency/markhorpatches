import type { Metadata } from "next";
import { Unlock } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSeller } from "@/lib/auth/session";
import { PageHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data";
import { patchTypeName } from "@/lib/catalog";
import { formatDate } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { statusTone } from "@/lib/ui-status";

export const metadata: Metadata = { title: "Unlocked RFQs" };

export default async function UnlockedRfqs() {
  const { seller } = await requireSeller("/seller/unlocked-rfqs");
  const unlocks = await prisma.rfqUnlock.findMany({ where: { sellerId: seller.id, status: { not: "REVOKED" } }, include: { rfq: { select: { id: true, publicRef: true, patchType: true, status: true, spec: { select: { quantity: true } }, quotes: { where: { sellerId: seller.id }, select: { status: true } } } } }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="Unlocked RFQs" description="RFQs you've purchased. Send a quote or message the buyer." />
      <DataTable rows={unlocks} rowKey={(u) => u.id} rowHref={(u) => `/seller/opportunities/${u.rfq.id}`} empty={<EmptyState icon={Unlock} title="No unlocked RFQs yet" />} columns={[
        { key: "r", header: "RFQ", cell: (u) => u.rfq.publicRef },
        { key: "w", header: "Request", cell: (u) => `${u.rfq.spec?.quantity.toLocaleString()} × ${patchTypeName(u.rfq.patchType)}` },
        { key: "p", header: "Paid", cell: (u) => formatMoney(u.priceMinor, u.currency), align: "right" },
        { key: "q", header: "Your quote", cell: (u) => (u.rfq.quotes[0] ? <Badge tone={statusTone("quote", u.rfq.quotes[0].status)}>{u.rfq.quotes[0].status.toLowerCase().replace("_", " ")}</Badge> : <Badge tone="amber">Not sent</Badge>) },
        { key: "s", header: "Access", cell: (u) => <Badge tone={u.status === "ACTIVE" ? "green" : "violet"}>{u.status.toLowerCase()}</Badge>, hideOnMobile: true },
        { key: "d", header: "Unlocked", cell: (u) => formatDate(u.createdAt), hideOnMobile: true },
      ]} />
    </>
  );
}
