import type { Metadata } from "next";
import { Radar } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSeller } from "@/lib/auth/session";
import { PageHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data";
import { patchTypeName } from "@/lib/catalog";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Matches" };

/** Match history with explanations — shows why you were (or weren't) eligible. No buyer data. */
export default async function SellerMatches() {
  const { seller } = await requireSeller("/seller/matches");
  const matches = await prisma.rfqMatch.findMany({ where: { sellerId: seller.id }, include: { rfq: { select: { id: true, publicRef: true, patchType: true, spec: { select: { quantity: true } } } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <PageHeader title="Matches" description="Every RFQ our engine evaluated for you, with the score and the reason. Use it to tune your capabilities." />
      <DataTable rows={matches} rowKey={(m) => m.id} rowHref={(m) => (m.eligible && (m.status === "NOTIFIED" || m.status === "APPROVED") ? `/seller/opportunities/${m.rfq.id}` : `/seller/matches#${m.id}`)} empty={<EmptyState icon={Radar} title="No matches evaluated yet" />} columns={[
        { key: "r", header: "RFQ", cell: (m) => m.rfq.publicRef },
        { key: "w", header: "Request", cell: (m) => `${m.rfq.spec?.quantity.toLocaleString()} × ${patchTypeName(m.rfq.patchType)}` },
        { key: "s", header: "Score", cell: (m) => (m.eligible ? m.score : "—"), align: "right" },
        { key: "e", header: "Result", cell: (m) => (m.eligible ? <Badge tone={m.status === "NOTIFIED" ? "green" : m.status === "REJECTED" ? "neutral" : "blue"}>{m.status === "NOTIFIED" ? "Notified" : m.status === "REJECTED" ? "Not selected" : "Eligible"}</Badge> : <span className="text-xs text-muted">{m.ineligibleReasons.join("; ")}</span>) },
        { key: "d", header: "Date", cell: (m) => formatDate(m.createdAt), hideOnMobile: true },
      ]} />
    </>
  );
}
