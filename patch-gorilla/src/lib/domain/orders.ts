import "server-only";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { loadSettings } from "@/lib/settings";
import { orderTotals } from "@/lib/pricing/engine";
import { shippingRates, taxRateBps, trackingUrlFor, type ShippingMethodCode } from "@/lib/services/shipping";
import { payments } from "@/lib/services/payments";
import { canTransition, ORDER_STATUS_LABEL } from "@/lib/orders/status";
import { addBusinessDays } from "@/lib/configurator/delivery";
import { siteUrl } from "@/lib/env";
import { orderAccessToken } from "@/lib/crypto";
import { emit } from "@/lib/events";
import { configurationInclude, describeConfiguration } from "./configurations";
import { loadCart } from "./cart";
import { withUniqueRef } from "./numbers";
import type { AddressInput } from "@/lib/configurator/schema";

export class OrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderError";
  }
}

export const orderInclude = {
  items: { include: { configuration: { include: configurationInclude }, proofs: { orderBy: { version: "desc" }, include: { approval: true, revisions: true } } } },
  statusEvents: { orderBy: { createdAt: "asc" } },
  shipments: { orderBy: { createdAt: "desc" } },
  payments: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.OrderInclude;

export type FullOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export async function getOrder(id: string) {
  return prisma.order.findUnique({ where: { id }, include: orderInclude });
}

export function orderUrl(orderId: string) {
  return siteUrl(`/order/${orderId}?t=${orderAccessToken(orderId)}`);
}

export async function validateCoupon(code: string | null | undefined, subtotalCents: number) {
  if (!code) return null;
  const c = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  const now = new Date();
  if (!c || !c.active) return null;
  if (c.startsAt && c.startsAt > now) return null;
  if (c.endsAt && c.endsAt < now) return null;
  if (c.maxRedemptions !== null && c.redemptions >= c.maxRedemptions) return null;
  if (subtotalCents < c.minSubtotalCents) return null;
  return { code: c.code, type: c.type, value: c.value, minSubtotalCents: c.minSubtotalCents };
}

/** Authoritative totals. Always computed on the server from fresh catalog + settings. */
export async function computeTotals(opts: { merchandiseCents: number; lineTotals: number[]; shippingMethod: ShippingMethodCode; state?: string | null; couponCode?: string | null }) {
  const settings = await loadSettings();
  const rate = shippingRates(settings.shipping, opts.merchandiseCents).find((r) => r.code === opts.shippingMethod) ?? shippingRates(settings.shipping, opts.merchandiseCents)[0];
  const coupon = await validateCoupon(opts.couponCode, opts.merchandiseCents);
  const totals = orderTotals({
    lines: opts.lineTotals.map((c) => ({ lineSubtotalCents: c })),
    coupon,
    shippingCents: rate.cents,
    taxRateBps: taxRateBps(settings.tax, opts.state),
    taxShipping: settings.tax.taxShipping,
  });
  return { totals, rate, coupon };
}

async function upsertCustomer(tx: Prisma.TransactionClient, c: { email: string; firstName?: string | null; lastName?: string | null; phone?: string | null; company?: string | null; marketingConsent?: boolean }) {
  return tx.customer.upsert({
    where: { email: c.email.toLowerCase() },
    create: { email: c.email.toLowerCase(), firstName: c.firstName, lastName: c.lastName, phone: c.phone || null, company: c.company || null, marketingConsent: !!c.marketingConsent },
    update: { firstName: c.firstName ?? undefined, lastName: c.lastName ?? undefined, phone: c.phone || undefined, company: c.company || undefined, ...(c.marketingConsent ? { marketingConsent: true } : {}) },
  });
}
export { upsertCustomer };

export interface CheckoutInput {
  contact: { firstName: string; lastName: string; email: string; phone?: string; company?: string };
  shipping: AddressInput;
  billing: AddressInput | null; // null = same as shipping
  shippingMethod: ShippingMethodCode;
  couponCode?: string | null;
  notes?: string | null;
  marketingConsent?: boolean;
  customerId?: string | null;
  utm?: Record<string, string> | null;
}

/** Cart → Order (PAYMENT_PENDING). Re-prices everything server-side. */
export async function createOrderFromCart(cartId: string, input: CheckoutInput) {
  const loaded = await loadCart(cartId);
  if (!loaded || loaded.cart.status !== "ACTIVE") throw new OrderError("Your cart is no longer available.");
  if (!loaded.activeLines.length) throw new OrderError("Your cart is empty.");
  if (loaded.hasInvalid) throw new OrderError("Some items in your cart need attention before checkout.");

  const { totals, rate, coupon } = await computeTotals({
    merchandiseCents: loaded.subtotalCents,
    lineTotals: loaded.activeLines.map((l) => l.totalCents),
    shippingMethod: input.shippingMethod,
    state: input.shipping.state,
    couponCode: input.couponCode,
  });

  const order = await prisma.$transaction(async (tx) => {
    const customer = await upsertCustomer(tx, { ...input.contact, marketingConsent: input.marketingConsent });
    const customerId = input.customerId ?? customer.id;
    const maxProduction = Math.max(...loaded.activeLines.map((l) => l.config.estimatedDeliveryDays ?? l.config.patchType.productionDays));
    return withUniqueRef("PG", (orderNumber) =>
      tx.order.create({
        data: {
          orderNumber, customerId, email: input.contact.email.toLowerCase(), firstName: input.contact.firstName, lastName: input.contact.lastName,
          phone: input.contact.phone || null, company: input.contact.company || null,
          status: "PAYMENT_PENDING", paymentStatus: "PENDING", source: "CHECKOUT",
          shippingAddress: input.shipping as object, billingAddress: (input.billing ?? input.shipping) as object, shippingMethod: rate.code,
          ...totals, couponCode: coupon?.code ?? null, customerNotes: input.notes || null, utm: input.utm ?? undefined,
          estimatedShipDate: addBusinessDays(new Date(), maxProduction + 2),
          items: {
            create: loaded.activeLines.map((l) => ({
              configurationId: l.configurationId, productName: l.config.patchType.name, quantity: l.config.quantity,
              unitPriceCents: l.unitPriceCents, totalCents: l.totalCents, specSnapshot: describeConfiguration(l.config) as object,
            })),
          },
          statusEvents: { create: [{ status: "PAYMENT_PENDING", note: "Checkout started" }] },
        },
      }),
    );
  });

  await emit({ type: "checkout.started", orderId: order.id });
  return order;
}

/** Existing order (quote / free-mockup path) → set address + shipping, recompute totals, ready to pay. */
export async function prepareOrderForPayment(orderId: string, input: Omit<CheckoutInput, "contact"> & { contact?: CheckoutInput["contact"] }) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (!["PROOF_APPROVED", "PAYMENT_PENDING"].includes(order.status) || order.paymentStatus === "PAID") throw new OrderError("This order isn't ready for payment.");
  const merchandise = order.items.reduce((s, i) => s + i.totalCents, 0);
  const { totals, rate, coupon } = await computeTotals({
    merchandiseCents: merchandise, lineTotals: order.items.map((i) => i.totalCents), shippingMethod: input.shippingMethod, state: input.shipping.state, couponCode: input.couponCode,
  });
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      ...totals, couponCode: coupon?.code ?? null, shippingMethod: rate.code, shippingAddress: input.shipping as object, billingAddress: (input.billing ?? input.shipping) as object,
      ...(input.contact ? { firstName: input.contact.firstName, lastName: input.contact.lastName, phone: input.contact.phone || null, company: input.contact.company || null } : {}),
      paymentStatus: "PENDING",
    },
  });
  if (order.status !== "PAYMENT_PENDING") await transitionOrder(orderId, "PAYMENT_PENDING", { note: "Ready for payment", silent: true });
  return updated;
}

/** Creates a hosted payment session for an order. Idempotent per order/total combination. */
export async function startPayment(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: { include: { configuration: { include: configurationInclude } } } } });
  if (order.paymentStatus === "PAID") throw new OrderError("This order is already paid.");
  if (order.totalCents <= 0) throw new OrderError("Order total must be above zero.");
  const adapter = payments();
  const attempt = await prisma.payment.count({ where: { orderId } });
  const idempotencyKey = `order_${order.id}_${order.totalCents}_${attempt}`;
  const token = orderAccessToken(order.id);
  const { redirectUrl, providerRef } = await adapter.createCheckout({
    orderId: order.id, orderNumber: order.orderNumber, email: order.email,
    lines: order.items.map((i) => {
      const d = describeConfiguration(i.configuration);
      return { name: `${d.patchType} × ${i.quantity}`, description: `${d.size} · ${d.shape} · ${d.backing}`, amountCents: i.totalCents };
    }),
    shippingCents: order.shippingCents, taxCents: order.taxCents, discountCents: order.discountCents, totalCents: order.totalCents,
    successUrl: siteUrl(`/order/${order.id}?t=${token}&paid=1`),
    cancelUrl: siteUrl(`/checkout?cancelled=1&order=${order.id}&t=${token}`),
    idempotencyKey,
  });
  await prisma.payment.create({ data: { orderId: order.id, provider: adapter.provider, providerRef, amountCents: order.totalCents, idempotencyKey, status: "PENDING" } });
  return { redirectUrl };
}

/** Webhook / mock-pay handler. Idempotent, verifies the amount. */
export async function markPaymentSucceeded(providerRef: string, amountCents: number | undefined) {
  const payment = await prisma.payment.findUnique({ where: { providerRef }, include: { order: { include: { items: { include: { proofs: true } } } } } });
  if (!payment) throw new OrderError(`Unknown payment ${providerRef}`);
  if (payment.status === "PAID") return payment.order;
  const order = payment.order;
  if (amountCents !== undefined && amountCents !== payment.amountCents) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: `Amount mismatch: expected ${payment.amountCents}, got ${amountCents}` } });
    throw new OrderError("Payment amount mismatch");
  }
  const allApproved = order.items.every((i) => i.proofs.some((p) => p.status === "APPROVED"));
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID" } });
    await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID", placedAt: order.placedAt ?? new Date(), status: "PAID" } });
    await tx.orderStatusEvent.create({ data: { orderId: order.id, status: "PAID", note: "Payment received" } });
    if (!allApproved) {
      await tx.order.update({ where: { id: order.id }, data: { status: "MOCKUP_PENDING" } });
      await tx.orderStatusEvent.create({ data: { orderId: order.id, status: "MOCKUP_PENDING", note: "Artwork review started" } });
    }
    if (order.couponCode) await tx.coupon.update({ where: { code: order.couponCode }, data: { redemptions: { increment: 1 } } }).catch(() => {});
    await tx.cart.updateMany({ where: { items: { some: { configurationId: { in: order.items.map((i) => i.configurationId) } } } }, data: { status: "CONVERTED" } });
  });
  await emit({ type: "order.paid", orderId: order.id });
  return order;
}

export async function markPaymentFailed(providerRef: string, reason: string) {
  await prisma.payment.updateMany({ where: { providerRef, status: { not: "PAID" } }, data: { status: "FAILED", failureReason: reason } });
}

export async function allProofsApproved(orderId: string) {
  const items = await prisma.orderItem.findMany({ where: { orderId }, include: { proofs: { orderBy: { version: "desc" }, take: 1 } } });
  return items.length > 0 && items.every((i) => i.proofs[0]?.status === "APPROVED");
}

export async function transitionOrder(orderId: string, to: OrderStatus, opts: { actorId?: string | null; note?: string; isPublic?: boolean; silent?: boolean } = {}) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  const check = canTransition(order.status, to, { paymentStatus: order.paymentStatus, allProofsApproved: await allProofsApproved(orderId) });
  if (!check.ok) throw new OrderError(check.reason);
  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { status: to } }),
    prisma.orderStatusEvent.create({ data: { orderId, status: to, note: opts.note ?? ORDER_STATUS_LABEL[to], isPublic: opts.isPublic ?? true, actorId: opts.actorId ?? null } }),
  ]);
  if (!opts.silent) await emit({ type: "order.status_changed", orderId, to });
}

export async function addShipment(orderId: string, input: { carrier: string; trackingNumber: string; service?: string; actorId?: string | null }) {
  const shipment = await prisma.shipment.create({
    data: {
      orderId, carrier: input.carrier, service: input.service || null, trackingNumber: input.trackingNumber,
      trackingUrl: trackingUrlFor(input.carrier, input.trackingNumber), status: "IN_TRANSIT", shippedAt: new Date(),
    },
  });
  await transitionOrder(orderId, "SHIPPED", { actorId: input.actorId, note: `Shipped via ${input.carrier}`, silent: true });
  await emit({ type: "order.shipped", orderId, shipmentId: shipment.id });
  return shipment;
}

export async function findOrderForTracking(orderNumber: string, email: string) {
  return prisma.order.findFirst({
    where: { orderNumber: orderNumber.trim().toUpperCase(), email: email.trim().toLowerCase() },
    include: { statusEvents: { where: { isPublic: true }, orderBy: { createdAt: "asc" } }, shipments: true },
  });
}

/** Reorder: clone every item's configuration into the customer's cart. */
export async function reorderToCart(orderId: string, cartId: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  const { cloneConfiguration } = await import("./configurations");
  for (const item of order.items) {
    await prisma.$transaction(async (tx) => {
      const clone = await cloneConfiguration(item.configurationId, { isSaved: false }, tx);
      await tx.cartItem.create({ data: { cartId, configurationId: clone.id, unitPriceSnapshotCents: item.unitPriceCents, totalSnapshotCents: item.totalCents } });
    });
  }
}
