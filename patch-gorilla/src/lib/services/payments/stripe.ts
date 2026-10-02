import "server-only";
import Stripe from "stripe";
import type { PaymentAdapter } from "./types";

/**
 * Stripe Checkout (hosted). Card data never touches our servers.
 * Apple Pay / Google Pay appear automatically when enabled in the Stripe dashboard.
 * We send ONE pre-computed amount per line — Stripe never decides prices.
 */
export function createStripeAdapter(): PaymentAdapter {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  const stripe = new Stripe(key);

  return {
    provider: "STRIPE",
    async createCheckout(i) {
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = i.lines.map((l) => ({
        quantity: 1,
        price_data: { currency: "usd", unit_amount: l.amountCents, product_data: { name: l.name, description: l.description.slice(0, 500) } },
      }));
      if (i.shippingCents > 0) lineItems.push({ quantity: 1, price_data: { currency: "usd", unit_amount: i.shippingCents, product_data: { name: "Shipping" } } });
      if (i.taxCents > 0) lineItems.push({ quantity: 1, price_data: { currency: "usd", unit_amount: i.taxCents, product_data: { name: "Sales tax" } } });

      let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
      if (i.discountCents > 0) {
        const coupon = await stripe.coupons.create({ amount_off: i.discountCents, currency: "usd", duration: "once", name: `Order ${i.orderNumber} discount` }, { idempotencyKey: `${i.idempotencyKey}:coupon` });
        discounts = [{ coupon: coupon.id }];
      }

      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          customer_email: i.email,
          client_reference_id: i.orderId,
          metadata: { orderId: i.orderId, orderNumber: i.orderNumber },
          payment_intent_data: { metadata: { orderId: i.orderId, orderNumber: i.orderNumber } },
          line_items: lineItems,
          discounts,
          success_url: i.successUrl,
          cancel_url: i.cancelUrl,
        },
        { idempotencyKey: i.idempotencyKey },
      );
      if (!session.url) throw new Error("Stripe did not return a checkout URL");
      return { redirectUrl: session.url, providerRef: session.id };
    },
    async parseWebhook(rawBody, signature) {
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!secret || !signature) throw new Error("Missing webhook secret or signature");
      const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
      switch (event.type) {
        case "checkout.session.completed":
        case "checkout.session.async_payment_succeeded": {
          const s = event.data.object as Stripe.Checkout.Session;
          if (s.payment_status !== "paid") return { id: event.id, type: "ignored", providerRef: s.id };
          return { id: event.id, type: "payment.succeeded", providerRef: s.id, orderId: s.metadata?.orderId ?? s.client_reference_id ?? undefined, amountCents: s.amount_total ?? undefined };
        }
        case "checkout.session.async_payment_failed":
        case "checkout.session.expired": {
          const s = event.data.object as Stripe.Checkout.Session;
          return { id: event.id, type: "payment.failed", providerRef: s.id, orderId: s.metadata?.orderId ?? undefined };
        }
        case "charge.refunded": {
          const c = event.data.object as Stripe.Charge;
          return { id: event.id, type: "payment.refunded", providerRef: String(c.payment_intent ?? c.id), orderId: c.metadata?.orderId, amountCents: c.amount_refunded };
        }
        default:
          return { id: event.id, type: "ignored", providerRef: "" };
      }
    },
  };
}
