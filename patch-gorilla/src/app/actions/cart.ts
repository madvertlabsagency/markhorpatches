"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureCart, currentCart, ownerContext } from "@/lib/cart-session";
import { addToCart, duplicateCartItem, removeCartItem, setSavedForLater, updateCartItem } from "@/lib/domain/cart";
import { ConfigurationError, createConfiguration } from "@/lib/domain/configurations";
import { getCurrentUser } from "@/lib/auth/session";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { validateCoupon } from "@/lib/domain/orders";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string; fields?: string[] };

function fail(e: unknown): ActionResult<never> {
  if (e instanceof ConfigurationError) return { ok: false, error: e.message, fields: e.fields };
  if (e instanceof z.ZodError) return { ok: false, error: "Some details are missing or invalid." };
  console.error("[cart action]", e);
  return { ok: false, error: "Something went wrong saving your patch. Please try again." };
}

export async function addToCartAction(config: unknown): Promise<ActionResult<{ itemId: string }>> {
  try {
    const rl = rateLimit(`cart:${await clientIp()}`, LIMITS.api.limit, LIMITS.api.windowMs);
    if (!rl.ok) return { ok: false, error: "Slow down a little — try again in a moment." };
    const cart = await ensureCart();
    const owner = await ownerContext();
    const item = await addToCart(cart.id, config, { ...owner, anonOwnerId: cart.id });
    revalidatePath("/", "layout");
    return { ok: true, data: { itemId: item.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function updateCartItemAction(itemId: string, config: unknown): Promise<ActionResult> {
  try {
    const cart = await ensureCart();
    await updateCartItem(cart.id, itemId, config, { ...(await ownerContext()), anonOwnerId: cart.id });
    revalidatePath("/cart");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeCartItemAction(itemId: string): Promise<ActionResult> {
  const cart = await currentCart();
  if (!cart) return { ok: false, error: "Cart not found." };
  await removeCartItem(cart.id, itemId);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function duplicateCartItemAction(itemId: string): Promise<ActionResult> {
  const cart = await currentCart();
  if (!cart) return { ok: false, error: "Cart not found." };
  await duplicateCartItem(cart.id, itemId);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveForLaterAction(itemId: string, saved: boolean): Promise<ActionResult> {
  const cart = await currentCart();
  if (!cart) return { ok: false, error: "Cart not found." };
  await setSavedForLater(cart.id, itemId, saved);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Save a design to the signed-in customer's account (saved designs). */
export async function saveDesignAction(config: unknown, name?: string): Promise<ActionResult<{ id: string }> | { ok: false; error: string; needsLogin: true }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to save designs.", needsLogin: true };
  try {
    const customer = user.customer ?? (await prisma.customer.upsert({ where: { email: user.email }, create: { email: user.email, userId: user.id }, update: {} }));
    const c = await createConfiguration({ ...(config as object), name: name ?? null }, { customerId: customer.id, anonOwnerId: (await ownerContext()).anonOwnerId });
    await prisma.patchConfiguration.update({ where: { id: c.id }, data: { isSaved: true, customerId: customer.id } });
    return { ok: true, data: { id: c.id } };
  } catch (e) {
    return fail(e);
  }
}

/** Captures an email on the cart (enables abandoned-cart follow-up only with explicit consent). */
export async function captureCartEmailAction(email: string, consent: boolean): Promise<ActionResult> {
  const parsed = z.string().trim().toLowerCase().email().safeParse(email);
  if (!parsed.success) return { ok: false, error: "Enter a valid email." };
  const cart = await ensureCart();
  await prisma.cart.update({ where: { id: cart.id }, data: { email: parsed.data, marketingConsent: consent } });
  return { ok: true };
}

export async function applyCouponAction(code: string, subtotalCents: number): Promise<ActionResult<{ code: string }>> {
  const rl = rateLimit(`coupon:${await clientIp()}`, LIMITS.form.limit, LIMITS.form.windowMs);
  if (!rl.ok) return { ok: false, error: "Too many attempts. Try again later." };
  const cart = await currentCart();
  if (!cart) return { ok: false, error: "Cart not found." };
  const c = await validateCoupon(code, subtotalCents);
  if (!c) return { ok: false, error: "That code isn't valid for this order." };
  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: c.code } });
  revalidatePath("/checkout");
  return { ok: true, data: { code: c.code } };
}

export async function removeCouponAction(): Promise<ActionResult> {
  const cart = await currentCart();
  if (cart) await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  revalidatePath("/checkout");
  return { ok: true };
}
