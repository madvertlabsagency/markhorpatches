import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSeller } from "@/lib/auth/session";
import { PageHeader, Badge, Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { statusTone } from "@/lib/ui-status";

export const metadata: Metadata = { title: "Transactions" };

export default async function TransactionsPage() {
  const { seller, org } = await requireSeller("/seller/transactions");
  const [unlocks, payments] = await Promise.all([
    prisma.rfqUnlock.findMany({ where: { sellerId: seller.id }, include: { rfq: { select: { publicRef: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.payment.findMany({ where: { orgId: org.id }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return (
    <>
      <PageHeader title="Transactions" description="Receipts for every RFQ purchase and every payment attempt." />
      <Card>
        <CardHeader title="RFQ purchases" />
        <DataTable rows={unlocks} rowKey={(u) => u.id} rowHref={(u) => `/seller/transactions/${u.id}`} empty={<div className="p-5"><EmptyState icon={Receipt} title="No purchases yet" /></div>} columns={[
          { key: "r", header: "Receipt", cell: (u) => <span className="tabular">{u.receiptNumber}</span> },
          { key: "f", header: "RFQ", cell: (u) => u.rfq.publicRef },
          { key: "m", header: "Method", cell: (u) => u.method.toLowerCase(), hideOnMobile: true },
          { key: "a", header: "Amount", cell: (u) => formatMoney(u.priceMinor, u.currency), align: "right" },
          { key: "s", header: "Status", cell: (u) => <Badge tone={u.status === "ACTIVE" ? "green" : u.status === "REVOKED" ? "neutral" : "violet"}>{u.status === "REVOKED" ? "not granted (credited)" : u.status.toLowerCase()}</Badge> },
          { key: "d", header: "Date", cell: (u) => formatDateTime(u.createdAt), hideOnMobile: true },
        ]} />
      </Card>
      <Card className="mt-6">
        <CardHeader title="Payments" description="Card and invoice payments, including failed and cancelled attempts." />
        <DataTable rows={payments} rowKey={(p) => p.id} dense empty={<p className="p-5 text-sm text-muted">No payments yet.</p>} columns={[
          { key: "d", header: "Date", cell: (p) => formatDateTime(p.createdAt) },
          { key: "p", header: "Purpose", cell: (p) => (p.purpose === "RFQ_UNLOCK" ? "RFQ unlock" : "Credit top-up") },
          { key: "v", header: "Provider", cell: (p) => p.provider, hideOnMobile: true },
          { key: "a", header: "Amount", cell: (p) => formatMoney(p.amountMinor, p.currency), align: "right" },
          { key: "s", header: "Status", cell: (p) => <Badge tone={statusTone("pay", p.status)}>{p.status.toLowerCase().replace("_", " ")}</Badge> },
        ]} />
      </Card>
    </>
  );
}
