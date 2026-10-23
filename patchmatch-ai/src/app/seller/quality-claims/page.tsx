import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSeller } from "@/lib/auth/session";
import { PageHeader, Card, CardHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data";
import { ClaimForm } from "@/components/seller/ClaimForm";
import { formatDate, daysAgo } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { statusTone } from "@/lib/ui-status";
import { CLAIM_WINDOW_DAYS } from "@/lib/domain/finance";

export const metadata: Metadata = { title: "Quality claims" };

export default async function QualityClaims({ searchParams }: { searchParams: Promise<{ unlock?: string }> }) {
  const { seller } = await requireSeller("/seller/quality-claims");
  const sp = await searchParams;
  const since = daysAgo(CLAIM_WINDOW_DAYS);
  const [eligible, claims] = await Promise.all([
    prisma.rfqUnlock.findMany({ where: { sellerId: seller.id, status: "ACTIVE", method: { not: "COMPLIMENTARY" }, createdAt: { gte: since }, disputes: { none: { status: { in: ["OPEN", "UNDER_REVIEW"] } } } }, include: { rfq: { select: { publicRef: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.dispute.findMany({ where: { sellerId: seller.id }, include: { unlock: { include: { rfq: { select: { publicRef: true } } } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <>
      <PageHeader title="Quality claims" description={`Under the RFQ Quality Policy you can claim a credit or refund within ${CLAIM_WINDOW_DAYS} days for invalid contact details, duplicates, spam or materially misdescribed requests.`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardHeader title="File a claim" />
          <div className="p-5">{eligible.length ? <ClaimForm unlocks={eligible.map((u) => ({ id: u.id, label: `${u.rfq.publicRef} · ${formatMoney(u.priceMinor, u.currency)} · ${formatDate(u.createdAt)}` }))} defaultUnlock={sp.unlock} /> : <p className="text-sm text-muted">No purchases are currently eligible for a claim.</p>}</div>
        </Card>
        <Card>
          <CardHeader title="Your claims" />
          <DataTable rows={claims} rowKey={(c) => c.id} empty={<div className="p-5"><EmptyState icon={ShieldAlert} title="No claims filed" /></div>} columns={[
            { key: "r", header: "RFQ", cell: (c) => c.unlock.rfq.publicRef },
            { key: "w", header: "Reason", cell: (c) => c.reason.toLowerCase().replace(/_/g, " ") },
            { key: "s", header: "Status", cell: (c) => <Badge tone={statusTone("dispute", c.status)}>{c.status.toLowerCase().replace("_", " ")}</Badge> },
            { key: "d", header: "Decision", cell: (c) => c.decision ?? "Pending review", hideOnMobile: true },
          ]} />
        </Card>
      </div>
    </>
  );
}
