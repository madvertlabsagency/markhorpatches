"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/session";
import { ensureCart } from "@/lib/cart-session";
import { reorderToCart } from "@/lib/domain/orders";
import { cloneConfiguration } from "@/lib/domain/configurations";

export async function reorderAction(fd: FormData) {
  const { customer } = await requireCustomer();
  if (!customer) redirect("/account");
  const order = await prisma.order.findFirst({ where: { id: String(fd.get("orderId")), customerId: customer.id } });
  if (!order) redirect("/account/orders");
  const cart = await ensureCart();
  await reorderToCart(order.id, cart.id);
  redirect("/cart");
}

export async function designToCartAction(fd: FormData) {
  const { customer } = await requireCustomer();
  if (!customer) redirect("/account");
  const config = await prisma.patchConfiguration.findFirst({ where: { id: String(fd.get("id")), customerId: customer.id, isSaved: true } });
  if (!config) redirect("/account/designs");
  const cart = await ensureCart();
  const clone = await cloneConfiguration(config.id, { isSaved: false });
  await prisma.cartItem.create({ data: { cartId: cart.id, configurationId: clone.id, unitPriceSnapshotCents: config.unitPriceCents ?? 0, totalSnapshotCents: config.subtotalCents ?? 0 } });
  redirect("/cart");
}

export async function deleteDesignAction(fd: FormData) {
  const { customer } = await requireCustomer();
  if (!customer) return;
  await prisma.patchConfiguration.updateMany({ where: { id: String(fd.get("id")), customerId: customer.id }, data: { isSaved: false } });
  redirect("/account/designs");
}
