"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentCart } from "@/lib/cart-session";
import { getCurrentUser } from "@/lib/auth/session";
import { addressInput, contactInput } from "@/lib/configurator/schema";
import { createOrderFromCart, markPaymentSucceeded, OrderError, prepareOrderForPayment, startPayment } from "@/lib/domain/orders";
import { verifyOrderAccessToken, verifyPayload } from "@/lib/crypto";
import { getUtm } from "@/lib/utm";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

const checkoutSchema = z.object({
  contact: contactInput,
  shipping: addressInput,
  billingSame: z.boolean(),
  billing: addressInput.nullable(),
  shippingMethod: z.enum(["standard", "expedited"]),
  couponCode: z.string().max(40).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  marketingConsent: z.boolean().optional(),
  orderId: z.string().optional().nullable(),
  orderToken: z.string().optional().nullable(),
});

export type CheckoutResult = { ok: true; redirectUrl: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function checkoutAction(raw: unknown): Promise<CheckoutResult> {
  const rl = rateLimit(`checkout:${await clientIp()}`, LIMITS.form.limit, LIMITS.form.windowMs);
  if (!rl.ok) return { ok: false, error: "Too many attempts. Please wait a few minutes and try again." };

  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] = i.message;
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }
  const d = parsed.data;
  if (!d.billingSame && !d.billing) return { ok: false, error: "Please enter a billing address.", fieldErrors: { "billing.line1": "Required" } };
  const user = await getCurrentUser();

  try {
    let orderId: string;
    if (d.orderId) {
      const order = await prisma.order.findUnique({ where: { id: d.orderId } });
      const allowed = order && (verifyOrderAccessToken(order.id, d.orderToken) || (user?.customer && order.customerId === user.customer.id));
      if (!allowed) return { ok: false, error: "We couldn't find that order." };
      await prepareOrderForPayment(order.id, { shipping: d.shipping, billing: d.billingSame ? null : d.billing, shippingMethod: d.shippingMethod, couponCode: d.couponCode, contact: d.contact });
      orderId = order.id;
    } else {
      const cart = await currentCart();
      if (!cart) return { ok: false, error: "Your cart has expired. Please add your patches again." };
      const order = await createOrderFromCart(cart.id, {
        contact: d.contact, shipping: d.shipping, billing: d.billingSame ? null : d.billing, shippingMethod: d.shippingMethod,
        couponCode: d.couponCode ?? cart.couponCode, notes: d.notes, marketingConsent: d.marketingConsent, customerId: user?.customer?.id ?? null, utm: await getUtm(),
      });
      orderId = order.id;
    }
    const { redirectUrl } = await startPayment(orderId);
    return { ok: true, redirectUrl };
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, error: e.message };
    console.error("[checkout]", e);
    return { ok: false, error: "We couldn't start your payment. No charge was made — please try again, or contact support if this continues." };
  }
}

/** Development-only payment simulator. Disabled unless PAYMENTS_PROVIDER=mock. */
export async function mockPayAction(formData: FormData) {
  if (process.env.PAYMENTS_PROVIDER === "stripe") throw new Error("Mock payments are disabled");
  const token = String(formData.get("token") ?? "");
  const outcome = String(formData.get("outcome") ?? "success");
  const data = verifyPayload<{ orderId: string; providerRef: string; amountCents: number; successUrl: string; cancelUrl: string }>(token);
  if (!data) throw new Error("Payment link expired");
  if (outcome !== "success") redirect(data.cancelUrl);
  await markPaymentSucceeded(data.providerRef, data.amountCents);
  redirect(data.successUrl);
}
