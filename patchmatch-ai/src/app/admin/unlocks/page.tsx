import type { Metadata } from "next";
import { Unlock } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Unlocks" };

export default async function AdminUnlocks() {
  await requireAdmin("payments:view");
  const unlocks = await prisma.rfqUnlock.findMany({ include: { rfq: { select: { id: true, publicRef: true } }, seller: { select: { id: true, legalName: true } }, disclosures: { select: { fields: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <PageHeader title="Unlocks" description="Every RFQ access grant with method and disclosure record." />
      <DataTable rows={unlocks} rowKey={(u) => u.id} rowHref={(u) => `/admin/matching/${u.rfq.id}`} empty={<EmptyState icon={Unlock} title="No unlocks yet" />} columns={[
        { key: "rc", header: "Receipt", cell: (u) => <span className="tabular">{u.receiptNumber}</span> },
        { key: "r", header: "RFQ", cell: (u) => u.rfq.publicRef },
        { key: "s", header: "Seller", cell: (u) => u.seller.legalName },
        { key: "m", header: "Method", cell: (u) => u.method.toLowerCase(), hideOnMobile: true },
        { key: "a", header: "Amount", cell: (u) => formatMoney(u.priceMinor, u.currency), align: "right" },
        { key: "st", header: "Status", cell: (u) => <Badge tone={u.status === "ACTIVE" ? "green" : "violet"}>{u.status.toLowerCase()}</Badge> },
        { key: "f", header: "Disclosed", cell: (u) => <span className="text-xs text-muted">{u.disclosures[0]?.fields.join(", ") ?? "—"}</span>, hideOnMobile: true },
        { key: "d", header: "When", cell: (u) => <>{formatDateTime(u.createdAt)}{u.isDemo && <Badge tone="violet" className="ml-1">demo</Badge>}</>, hideOnMobile: true },
      ]} />
    </>
  );
}
