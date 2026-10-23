import type { Metadata } from "next";
import { MessageSquareQuote } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireBuyer } from "@/lib/auth/session";
import { PageHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { statusTone } from "@/lib/ui-status";

export const metadata: Metadata = { title: "Quotes" };

export default async function BuyerQuotes() {
  const { user, org } = await requireBuyer("/buyer/quotes");
  const quotes = await prisma.quote.findMany({ where: { status: { not: "DRAFT" }, rfq: { OR: [{ buyerOrgId: org.id }, { buyerUserId: user.id }] } }, include: { seller: true, rfq: { select: { id: true, publicRef: true } } }, orderBy: { submittedAt: "desc" } });
  return (
    <>
      <PageHeader title="Quotes" description="All quotations across your requests. Open a request to compare side by side." />
      <DataTable
        rows={quotes}
        rowKey={(q) => q.id}
        rowHref={(q) => `/buyer/rfqs/${q.rfq.id}#quotes`}
        empty={<EmptyState icon={MessageSquareQuote} title="No quotes yet" />}
        columns={[
          { key: "m", header: "Manufacturer", cell: (q) => q.seller.tradingName ?? q.seller.legalName },
          { key: "r", header: "RFQ", cell: (q) => q.rfq.publicRef },
          { key: "t", header: "Total", cell: (q) => formatMoney(q.totalMinor, q.currency), align: "right" },
          { key: "u", header: "Unit", cell: (q) => formatMoney(q.unitPriceMinor, q.currency), align: "right", hideOnMobile: true },
          { key: "d", header: "Production", cell: (q) => `${q.productionDays} days`, hideOnMobile: true },
          { key: "s", header: "Received", cell: (q) => formatDate(q.submittedAt), hideOnMobile: true },
          { key: "st", header: "Status", cell: (q) => <Badge tone={statusTone("quote", q.status)}>{q.status.replace(/_/g, " ").toLowerCase()}</Badge> },
        ]}
      />
    </>
  );
}
