import Link from "next/link";
import { requireCustomer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { OrderRow } from "@/components/account/OrderRow";

export default async function AccountHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { customer } = await requireCustomer();
  if (!customer) {
    return <EmptyState title={welcome ? "Welcome to the troop." : "Almost there."} description="Confirm your email (check your inbox) and your orders, proofs and saved designs will appear here." action={<ButtonLink href="/build-your-patch" arrow>Build a patch</ButtonLink>} />;
  }
  const [orders, pendingProofs, designs] = await Promise.all([
    prisma.order.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" }, take: 5, include: { items: true } }),
    prisma.proof.count({ where: { status: "SENT", orderItem: { order: { customerId: customer.id } } } }),
    prisma.patchConfiguration.count({ where: { customerId: customer.id, isSaved: true } }),
  ]);
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/account/proofs" className={`rounded-2xl p-5 ring-1 ${pendingProofs ? "bg-signature text-white ring-transparent" : "bg-white ring-line"}`}>
          <p className="display text-5xl">{pendingProofs}</p><p className="text-sm font-semibold">Proof{pendingProofs === 1 ? "" : "s"} awaiting approval</p>
        </Link>
        <Link href="/account/orders" className="rounded-2xl bg-white p-5 ring-1 ring-line"><p className="display text-5xl">{orders.length}</p><p className="text-sm font-semibold">Recent orders</p></Link>
        <Link href="/account/designs" className="rounded-2xl bg-white p-5 ring-1 ring-line"><p className="display text-5xl">{designs}</p><p className="text-sm font-semibold">Saved designs</p></Link>
      </div>
      <div>
        <h2 className="font-display text-3xl font-extrabold uppercase">Recent orders</h2>
        {orders.length ? <ul className="mt-4 space-y-3">{orders.map((o) => <OrderRow key={o.id} o={o} />)}</ul> : <EmptyState className="mt-4" title="No orders yet." description="Your first patch is a few clicks away." action={<ButtonLink href="/build-your-patch" arrow>Build your patch</ButtonLink>} />}
      </div>
    </div>
  );
}
