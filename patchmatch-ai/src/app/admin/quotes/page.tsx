import type { Metadata } from "next";
import { MessageSquareQuote } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { statusTone } from "@/lib/ui-status";

export const metadata: Metadata = { title: "Quotes" };

export default async function AdminQuotes() {
  await requireAdmin("quotes:view");
  const quotes = await prisma.quote.findMany({ where: { status: { not: "DRAFT" } }, include: { rfq: { select: { id: true, publicRef: true } }, seller: { select: { legalName: true } } }, orderBy: { submittedAt: "desc" }, take: 200 });
  return (
    <>
      <PageHeader title="Quotes" description="Quotations sent to buyers. The platform doesn't process order payments." />
      <DataTable rows={quotes} rowKey={(q) => q.id} rowHref={(q) => `/admin/rfq-review/${q.rfq.id}`} empty={<EmptyState icon={MessageSquareQuote} title="No quotes yet" />} columns={[
        { key: "r", header: "RFQ", cell: (q) => q.rfq.publicRef }, { key: "s", header: "Seller", cell: (q) => q.seller.legalName },
        { key: "t", header: "Total", cell: (q) => formatMoney(q.totalMinor, q.currency), align: "right" }, { key: "v", header: "Ver.", cell: (q) => q.version, align: "right", hideOnMobile: true },
        { key: "st", header: "Status", cell: (q) => <Badge tone={statusTone("quote", q.status)}>{q.status.toLowerCase().replace("_", " ")}</Badge> },
        { key: "d", header: "Sent", cell: (q) => formatDateTime(q.submittedAt), hideOnMobile: true },
      ]} />
    </>
  );
}
