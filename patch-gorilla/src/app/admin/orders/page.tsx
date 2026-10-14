import Link from "next/link";
import type { OrderStatus, PaymentStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { ORDER_STATUS_LABEL, statusTone } from "@/lib/orders/status";
import { formatUSD } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { AdminHeader, Table, inputCls, btnCls } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";

const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; payment?: string; q?: string; page?: string }> }) {
  await requireStaff("orders:read");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const where: Prisma.OrderWhereInput = {
    ...(sp.status && STATUSES.includes(sp.status as OrderStatus) ? { status: sp.status as OrderStatus } : {}),
    ...(sp.payment ? { paymentStatus: sp.payment as PaymentStatus } : {}),
    ...(sp.q ? { OR: [{ orderNumber: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { lastName: { contains: sp.q, mode: "insensitive" } }, { company: { contains: sp.q, mode: "insensitive" } }] } : {}),
  };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, skip: (page - 1) * 50, include: { items: true } }),
    prisma.order.count({ where }),
  ]);
  return (
    <div>
      <AdminHeader title="Orders" description={`${total} order(s)`} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Order #, email, name, company" className={`${inputCls} max-w-xs`} aria-label="Search orders" />
        <select name="status" defaultValue={sp.status ?? ""} className={`${inputCls} max-w-[200px]`} aria-label="Status"><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}</select>
        <select name="payment" defaultValue={sp.payment ?? ""} className={`${inputCls} max-w-[160px]`} aria-label="Payment"><option value="">Any payment</option>{["UNPAID", "PENDING", "PAID", "REFUNDED", "FAILED"].map((s) => <option key={s}>{s}</option>)}</select>
        <button className={btnCls}>Filter</button>
      </form>
      <Table head={["Order", "Customer", "Items", "Status", "Payment", "Total", "Created"]} empty="No orders match.">
        {orders.map((o) => (
          <tr key={o.id} className="hover:bg-offwhite">
            <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-patch">{o.orderNumber}</Link><p className="text-xs text-slate">{o.source.replace("_", " ").toLowerCase()}</p></td>
            <td className="px-4 py-3">{[o.firstName, o.lastName].filter(Boolean).join(" ")}<p className="text-xs text-slate">{o.email}</p></td>
            <td className="px-4 py-3 text-xs">{o.items.map((i) => `${i.productName.replace(" Patches", "")} ×${i.quantity}`).join(", ")}</td>
            <td className="px-4 py-3"><Badge tone={statusTone(o.status)}>{ORDER_STATUS_LABEL[o.status]}</Badge></td>
            <td className="px-4 py-3"><Badge tone={o.paymentStatus === "PAID" ? "success" : "neutral"}>{o.paymentStatus}</Badge></td>
            <td className="px-4 py-3">{formatUSD(o.totalCents)}</td>
            <td className="px-4 py-3 text-slate">{formatDate(o.createdAt)}</td>
          </tr>
        ))}
      </Table>
      {total > page * 50 && <Link href={`/admin/orders?${new URLSearchParams({ ...sp, page: String(page + 1) } as Record<string, string>)}`} className="mt-4 inline-block text-sm font-semibold text-patch">Next page →</Link>}
    </div>
  );
}
