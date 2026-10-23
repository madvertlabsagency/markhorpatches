import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Paperclip } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Card, CardHeader, Badge, KeyValue } from "@/components/ui/primitives";
import { ActionButton } from "@/components/ui/client";
import { DisputeDecisionForm } from "@/components/admin/DisputeDecisionForm";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { statusTone } from "@/lib/ui-status";
import { disputeReviewAction } from "../../actions";

export const metadata: Metadata = { title: "Claim" };

export default async function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin("disputes:decide");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = await prisma.dispute.findUnique({ where: { id }, include: { evidence: true, seller: true, refund: true, unlock: { include: { payment: true, rfq: { include: { conversations: { where: { sellerId: undefined }, include: { messages: { orderBy: { createdAt: "asc" }, take: 30 } } } } } } } } });
  if (!d) notFound();
  const conv = d.unlock.rfq.conversations.find((c) => c.sellerId === d.sellerId);
  const sellerClaims = await prisma.dispute.groupBy({ by: ["status"], where: { sellerId: d.sellerId }, _count: true });
  const open = d.status === "OPEN" || d.status === "UNDER_REVIEW";
  return (
    <>
      <PageHeader eyebrow="Quality claim" title={`${d.seller.legalName} — ${d.unlock.rfq.publicRef}`} description={`Filed ${formatDateTime(d.createdAt)}`} actions={<><Badge tone={statusTone("dispute", d.status)}>{d.status.toLowerCase().replace("_", " ")}</Badge>{d.status === "OPEN" && <ActionButton action={disputeReviewAction.bind(null, d.id)}>Start review</ActionButton>}</>} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card><CardHeader title="Claim" /><div className="space-y-4 p-5"><KeyValue items={[{ label: "Reason", value: d.reason.toLowerCase().replace(/_/g, " ") }, { label: "Amount", value: formatMoney(d.unlock.priceMinor) }, { label: "Paid with", value: d.unlock.method.toLowerCase() }, { label: "Unlocked", value: formatDateTime(d.unlock.createdAt) }]} /><p className="whitespace-pre-line text-sm">{d.description}</p>
            {d.evidence.map((e) => <a key={e.id} href={`/api/files/${e.id}`} className="flex items-center gap-1.5 text-sm text-electric"><Paperclip className="h-4 w-4" />{e.originalFilename}</a>)}</div></Card>
          <Card><CardHeader title="Conversation with buyer" description="Evidence of contact attempts." action={<Link href={`/admin/rfq-review/${d.unlock.rfqId}`} className="text-sm font-semibold text-electric">RFQ →</Link>} />
            <ul className="divide-y divide-line text-sm">{!conv?.messages.length && <li className="px-5 py-3 text-muted">No messages.</li>}{conv?.messages.map((m) => <li key={m.id} className="px-5 py-2"><span className="text-xs font-semibold text-muted">{m.side.toLowerCase()} · {formatDateTime(m.createdAt)}</span><p>{m.body}</p></li>)}</ul></Card>
        </div>
        <div className="space-y-6">
          {open ? <Card><CardHeader title="Decision" /><div className="p-5"><DisputeDecisionForm disputeId={d.id} canRefund={d.unlock.method === "CARD" && !!d.unlock.payment?.providerRef} /></div></Card> : <Card className="p-5 text-sm"><p className="font-semibold">Decision</p><p className="mt-1 text-muted">{d.decision}</p>{d.refund && <p className="mt-2">{d.refund.method === "CREDIT" ? "Credit" : "Refund"} {formatMoney(d.refund.amountMinor)} · {d.refund.status.toLowerCase()}</p>}</Card>}
          <Card><CardHeader title="Seller claim history" /><ul className="divide-y divide-line text-sm">{sellerClaims.map((c) => <li key={c.status} className="flex justify-between px-5 py-2"><span>{c.status.toLowerCase().replace("_", " ")}</span><span>{c._count}</span></li>)}</ul></Card>
        </div>
      </div>
    </>
  );
}
