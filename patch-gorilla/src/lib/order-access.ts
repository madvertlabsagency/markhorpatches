import "server-only";
import { getOrder } from "@/lib/domain/orders";
import { verifyOrderAccessToken } from "@/lib/crypto";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";

/** An order is visible to: holders of its signed link, the owning signed-in customer, or staff. */
export async function getAccessibleOrder(orderId: string, token?: string | null) {
  const [order, user] = await Promise.all([getOrder(orderId), getCurrentUser()]);
  if (!order) return null;
  const owner = !!user?.customer && order.customerId === user.customer.id && !!user.emailVerified;
  const ok = verifyOrderAccessToken(order.id, token) || owner || isStaff(user?.role);
  if (!ok) return null;
  return { order, user, actorEmail: user?.email ?? order.email, customerId: user?.customer?.id ?? order.customerId };
}
