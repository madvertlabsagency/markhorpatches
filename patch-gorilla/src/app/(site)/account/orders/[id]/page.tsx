import { notFound, redirect } from "next/navigation";
import { requireCustomer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { orderAccessToken } from "@/lib/crypto";

/** Account order detail → the canonical order page (proofs, tracking, invoice). */
export default async function AccountOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { customer } = await requireCustomer(`/account/orders/${id}`);
  if (!customer) notFound();
  const order = await prisma.order.findFirst({ where: { id, customerId: customer.id }, select: { id: true } });
  if (!order) notFound();
  redirect(`/order/${order.id}?t=${orderAccessToken(order.id)}`);
}
