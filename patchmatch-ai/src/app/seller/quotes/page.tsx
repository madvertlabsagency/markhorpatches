import type { Metadata } from "next";
import { MessageSquareQuote } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSeller } from "@/lib/auth/session";
import { PageHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data";
import { formatDate } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { statusTone } from "@/lib/ui-status";

export const metadata: Metadata = { title: "Quotes" };

export default async function SellerQuotes() {
  const { seller } = await requireSeller("/seller/quotes");
  const quotes = await prisma.quote.findMany({ where: { sellerId: seller.id }, include: { rfq: { select: { id: true, publicRef: true } } }, orderBy: { updatedAt: "desc" } });
  return (
    <>
      <PageHeader title="Quotes" />
      <DataTable rows={quotes} rowKey={(q) => q.id} rowHref={(q) => `/seller/opportunities/${q.rfq.id}#quote`} empty={<EmptyState icon={MessageSquareQuote} title="No quotes yet" description="Unlock an RFQ to send a quotation." />} columns={[
        { key: "r", header: "RFQ", cell: (q) => q.rfq.publicRef },
        { key: "t", header: "Total", cell: (q) => formatMoney(q.totalMinor, q.currency), align: "right" },
        { key: "v", header: "Version", cell: (q) => `v${q.version}`, hideOnMobile: true },
        { key: "s", header: "Status", cell: (q) => <Badge tone={statusTone("quote", q.status)}>{q.status.toLowerCase().replace("_", " ")}</Badge> },
        { key: "d", header: "Sent", cell: (q) => formatDate(q.submittedAt), hideOnMobile: true },
      ]} />
    </>
  );
}
