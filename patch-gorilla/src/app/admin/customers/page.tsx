import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { formatUSD } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { AdminHeader, Card, Table, inputCls, btnCls } from "@/components/admin/ui";

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff("customers:read");
  const { q } = await searchParams;
  const [customers, leads] = await Promise.all([
    prisma.customer.findMany({
      where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { company: { contains: q, mode: "insensitive" } }] } : {},
      orderBy: { createdAt: "desc" }, take: 100,
      include: { orders: { select: { totalCents: true, paymentStatus: true, id: true, orderNumber: true } }, user: { select: { emailVerified: true } } },
    }),
    prisma.lead.findMany({ where: { source: "SUPPORT" }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return (
    <div className="space-y-6">
      <AdminHeader title="Customers" />
      <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Email, name or company" className={`${inputCls} max-w-xs`} aria-label="Search customers" /><button className={btnCls}>Search</button></form>
      <Table head={["Customer", "Company", "Account", "Orders", "Lifetime paid", "Marketing", "Since"]} empty="No customers yet.">
        {customers.map((c) => {
          const paid = c.orders.filter((o) => o.paymentStatus === "PAID").reduce((s, o) => s + o.totalCents, 0);
          return (
            <tr key={c.id}>
              <td className="px-4 py-3"><p className="font-semibold">{[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}</p><p className="text-xs text-slate">{c.email}</p></td>
              <td className="px-4 py-3">{c.company ?? "—"}</td>
              <td className="px-4 py-3 text-xs">{c.user ? (c.user.emailVerified ? "Verified" : "Unverified") : "Guest"}</td>
              <td className="px-4 py-3 text-xs">{c.orders.slice(0, 3).map((o) => <Link key={o.id} href={`/admin/orders/${o.id}`} className="mr-2 text-patch">{o.orderNumber}</Link>)}{c.orders.length > 3 ? `+${c.orders.length - 3}` : ""}</td>
              <td className="px-4 py-3">{formatUSD(paid)}</td>
              <td className="px-4 py-3 text-xs">{c.marketingConsent ? "Opted in" : "—"}</td>
              <td className="px-4 py-3 text-slate">{formatDate(c.createdAt)}</td>
            </tr>
          );
        })}
      </Table>
      <Card title="Recent support requests">
        <ul className="divide-y divide-line text-sm">{leads.map((l) => { const p = (l.payload ?? {}) as Record<string, string>; return <li key={l.id} className="py-3"><p className="font-semibold">{p.topic} · {l.email}{p.orderNumber ? ` · ${p.orderNumber}` : ""}</p><p className="text-slate">{p.message}</p><p className="text-xs text-slate">{formatDate(l.createdAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p></li>; })}</ul>
        {!leads.length && <p className="text-sm text-slate">No support requests yet.</p>}
      </Card>
    </div>
  );
}
