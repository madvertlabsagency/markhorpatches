import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { formatUSD } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/orders/status";
import { AdminHeader, Card, Notice, Stat, Table } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000);
}

export default async function AdminDashboard() {
  await requireStaff("dashboard:view");
  const since = daysAgo(30);
  const [orders30, paidAgg, mockups30, pendingProofWork, approvals30, quotes, recent, topItems, crmFailed, sampleReviews] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: since }, source: { not: "FREE_MOCKUP" } } }),
    prisma.order.aggregate({ where: { paymentStatus: "PAID", placedAt: { gte: since } }, _sum: { totalCents: true }, _count: true }),
    prisma.mockupRequest.count({ where: { createdAt: { gte: since } } }),
    prisma.order.count({ where: { status: { in: ["MOCKUP_PENDING", "REVISION_REQUESTED"] } } }),
    prisma.proofApproval.count({ where: { approvedAt: { gte: since } } }),
    prisma.quote.count({ where: { status: { in: ["OPEN", "SENT"] } } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.orderItem.groupBy({ by: ["productName"], where: { order: { paymentStatus: "PAID" } }, _sum: { totalCents: true, quantity: true }, _count: true, orderBy: { _sum: { totalCents: "desc" } }, take: 5 }),
    prisma.cRMEvent.count({ where: { status: { in: ["FAILED", "DEAD"] } } }),
    prisma.review.count({ where: { isSample: true } }),
  ]);
  const revenue = paidAgg._sum.totalCents ?? 0;
  const aov = paidAgg._count ? Math.round(revenue / paidAgg._count) : 0;
  return (
    <div>
      <AdminHeader title="Dashboard" description="Last 30 days. All figures come straight from the database — nothing is estimated." />
      {sampleReviews > 0 && <Notice tone="warn">{sampleReviews} sample review(s) are still in the database. <Link href="/admin/reviews" className="underline">Remove them before launch.</Link></Notice>}
      {crmFailed > 0 && <Notice tone="error">{crmFailed} CRM event(s) failed. <Link href="/admin/integrations" className="underline">Review integration logs.</Link></Notice>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Revenue (paid)" value={formatUSD(revenue)} hint={`${paidAgg._count} paid orders`} href="/admin/orders?payment=PAID" />
        <Stat label="Orders" value={orders30} hint="Checkout + quote orders" href="/admin/orders" />
        <Stat label="Mockup requests" value={mockups30} href="/admin/mockups" />
        <Stat label="Needs proof work" value={pendingProofWork} hint="Mockup pending or revision requested" href="/admin/proofs" />
        <Stat label="Proof approvals" value={approvals30} />
        <Stat label="Open quotes" value={quotes} />
        <Stat label="Average order value" value={aov ? formatUSD(aov) : "—"} />
        <Stat label="Top product" value={topItems[0]?.productName.replace(" Patches", "") ?? "—"} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card title="Recent orders" actions={<Link href="/admin/orders" className="text-sm font-semibold text-patch">All orders →</Link>}>
          <Table head={["Order", "Customer", "Status", "Total", "Date"]} empty="No orders yet.">
            {recent.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-patch">{o.orderNumber}</Link></td>
                <td className="px-4 py-3">{o.email}</td>
                <td className="px-4 py-3"><Badge>{ORDER_STATUS_LABEL[o.status]}</Badge></td>
                <td className="px-4 py-3">{formatUSD(o.totalCents)}</td>
                <td className="px-4 py-3 text-slate">{formatDate(o.createdAt)}</td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Top products (paid)">
          {topItems.length ? (
            <ul className="divide-y divide-line">{topItems.map((t) => <li key={t.productName} className="flex justify-between py-2.5 text-sm"><span>{t.productName}<span className="block text-xs text-slate">{t._sum.quantity?.toLocaleString("en-US")} pcs · {t._count} lines</span></span><span className="font-semibold">{formatUSD(t._sum.totalCents ?? 0)}</span></li>)}</ul>
          ) : <p className="text-sm text-slate">No paid orders yet.</p>}
        </Card>
      </div>
    </div>
  );
}
