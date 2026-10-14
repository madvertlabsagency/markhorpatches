import { requireCustomer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { OrderRow } from "@/components/account/OrderRow";

export default async function AccountOrders() {
  const { customer } = await requireCustomer("/account/orders");
  if (!customer) return <EmptyState title="Confirm your email" description="Your orders appear here once your email is confirmed." />;
  const orders = await prisma.order.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" }, include: { items: true } });
  return (
    <div>
      <h2 className="font-display text-3xl font-extrabold uppercase">Orders & quotes</h2>
      {orders.length ? <ul className="mt-4 space-y-3">{orders.map((o) => <OrderRow key={o.id} o={o} />)}</ul> : <EmptyState className="mt-4" title="No orders yet." action={<ButtonLink href="/free-mockup" arrow>Get a free mockup</ButtonLink>} />}
    </div>
  );
}
