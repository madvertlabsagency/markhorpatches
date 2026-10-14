import Link from "next/link";
import { requireCustomer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { orderAccessToken } from "@/lib/crypto";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { formatDate } from "@/lib/utils";

export default async function AccountProofs() {
  const { customer } = await requireCustomer("/account/proofs");
  if (!customer) return <EmptyState title="Confirm your email" description="Your proofs appear here once your email is confirmed." />;
  const proofs = await prisma.proof.findMany({ where: { status: { not: "DRAFT" }, orderItem: { order: { customerId: customer.id } } }, orderBy: { createdAt: "desc" }, include: { orderItem: { include: { order: true } } } });
  if (!proofs.length) return <EmptyState title="No proofs yet." description="When our designers send a proof, it'll appear here for approval." />;
  return (
    <div>
      <h2 className="font-display text-3xl font-extrabold uppercase">Proofs</h2>
      <ul className="mt-4 space-y-3">
        {proofs.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 ring-1 ring-line">
            <div>
              <p className="font-semibold">{p.orderItem.productName} · V{p.version}</p>
              <p className="text-sm text-slate">Order {p.orderItem.order.orderNumber} · {formatDate(p.sentAt ?? p.createdAt)}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={p.status === "SENT" ? "action" : p.status === "APPROVED" ? "success" : "neutral"}>{p.status === "SENT" ? "Awaiting your approval" : p.status === "APPROVED" ? "Approved" : p.status === "REVISION_REQUESTED" ? "Revision requested" : "Replaced"}</Badge>
              <Link href={`/order/${p.orderItem.orderId}?t=${orderAccessToken(p.orderItem.orderId)}#proof-${p.orderItemId}`} className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">{p.status === "SENT" ? "Review" : "View"}</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
