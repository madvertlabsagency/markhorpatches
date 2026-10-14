import "server-only";
import { cookies } from "next/headers";
import { createCart, findCartByToken, attachCartToCustomer } from "@/lib/domain/cart";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const COOKIE = "pg_cart";

/** Read-only: the visitor's active cart, if any. */
export async function currentCart() {
  const token = (await cookies()).get(COOKIE)?.value;
  const cart = await findCartByToken(token);
  return cart && cart.status === "ACTIVE" ? cart : null;
}

/** Get or create the visitor's cart (only callable from Server Actions / Route Handlers). */
export async function ensureCart() {
  const existing = await currentCart();
  const user = await getCurrentUser();
  if (existing) {
    if (user?.customer && !existing.customerId) await attachCartToCustomer(existing.id, user.customer.id);
    return existing;
  }
  const { cart, token } = await createCart(user?.customer?.id);
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 60 });
  return cart;
}

export async function cartCount() {
  const cart = await currentCart();
  if (!cart) return 0;
  return prisma.cartItem.count({ where: { cartId: cart.id, savedForLater: false } });
}

export async function ownerContext() {
  const user = await getCurrentUser();
  const cart = await currentCart();
  return { customerId: user?.customer?.id ?? null, anonOwnerId: cart?.id ?? null };
}
