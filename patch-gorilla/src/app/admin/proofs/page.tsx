import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { ORDER_STATUS_LABEL } from "@/lib/orders/status";
import { formatDate } from "@/lib/utils";
import { AdminHeader, Card, Table } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";

export default async function AdminProofs() {
  await requireStaff("proofs:write");
  const [needsWork, awaiting, recent] = await Promise.all([
    prisma.order.findMany({ where: { status: { in: ["MOCKUP_PENDING", "REVISION_REQUESTED"] } }, orderBy: { updatedAt: "asc" }, include: { items: true } }),
    prisma.proof.findMany({ where: { status: "SENT" }, orderBy: { sentAt: "asc" }, include: { orderItem: { include: { order: true } } } }),
    prisma.proofApproval.findMany({ orderBy: { approvedAt: "desc" }, take: 15, include: { proof: { include: { orderItem: { include: { order: true } } } } } }),
  ]);
  return (
    <div className="space-y-6">
      <AdminHeader title="Proofs" description="Design queue: oldest first." />
      <Card title={`Needs a proof (${needsWork.length})`}>
        <Table head={["Order", "Status", "Items", "Waiting since"]} empty="Queue is clear 🎉">
          {needsWork.map((o) => (
            <tr key={o.id}><td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-patch">{o.orderNumber}</Link></td><td className="px-4 py-3"><Badge tone={o.status === "REVISION_REQUESTED" ? "danger" : "info"}>{ORDER_STATUS_LABEL[o.status]}</Badge></td><td className="px-4 py-3 text-xs">{o.items.map((i) => i.productName).join(", ")}</td><td className="px-4 py-3 text-slate">{formatDate(o.updatedAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td></tr>
          ))}
        </Table>
      </Card>
      <Card title={`Awaiting customer (${awaiting.length})`}>
        <Table head={["Order", "Proof", "Sent"]} empty="None.">
          {awaiting.map((p) => <tr key={p.id}><td className="px-4 py-3"><Link href={`/admin/orders/${p.orderItem.orderId}`} className="font-semibold text-patch">{p.orderItem.order.orderNumber}</Link></td><td className="px-4 py-3">{p.orderItem.productName} · V{p.version}</td><td className="px-4 py-3 text-slate">{p.sentAt ? formatDate(p.sentAt) : "—"}</td></tr>)}
        </Table>
      </Card>
      <Card title="Recent approvals">
        <Table head={["Order", "Proof", "Approved by", "When", "Content hash"]} empty="None yet.">
          {recent.map((a) => <tr key={a.id}><td className="px-4 py-3">{a.proof.orderItem.order.orderNumber}</td><td className="px-4 py-3">V{a.proof.version}</td><td className="px-4 py-3">{a.approvedByEmail}{a.ipAddress ? <span className="block text-xs text-slate">IP {a.ipAddress}</span> : null}</td><td className="px-4 py-3 text-slate">{formatDate(a.approvedAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td><td className="px-4 py-3 font-mono text-xs text-slate">{a.contentHash.slice(0, 12)}…</td></tr>)}
        </Table>
      </Card>
    </div>
  );
}
