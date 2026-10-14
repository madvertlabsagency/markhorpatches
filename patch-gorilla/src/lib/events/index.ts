import "server-only";
/**
 * Domain events → side effects (email lifecycle + CRM). Everything is event-driven:
 * domain services call `emit()`, never the email/CRM providers directly.
 * Handlers never throw — a failing integration must not break an order.
 */
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { orderAccessToken } from "@/lib/crypto";
import { loadSettings } from "@/lib/settings";
import { sendTemplatedEmail, type EmailData } from "@/lib/services/email";
import { enqueueCrmEvent } from "@/lib/services/crm";
import type { CrmEventPayload } from "@/lib/services/crm/types";
import { formatUSD } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/orders/status";
import type { OrderStatus } from "@/generated/prisma/enums";

export type DomainEvent =
  | { type: "mockup.submitted"; mockupRequestId: string; leadId: string }
  | { type: "quote.submitted"; quoteId: string }
  | { type: "checkout.started"; orderId: string }
  | { type: "order.paid"; orderId: string }
  | { type: "order.status_changed"; orderId: string; to: OrderStatus }
  | { type: "order.shipped"; orderId: string; shipmentId: string }
  | { type: "proof.sent"; proofId: string }
  | { type: "proof.approved"; proofId: string }
  | { type: "proof.revision_requested"; proofId: string; revisionId: string }
  | { type: "support.requested"; leadId: string }
  | { type: "configurator.abandoned"; cartId: string };

const orderLink = (id: string) => siteUrl(`/order/${id}?t=${orderAccessToken(id)}`);

async function loadOrder(orderId: string) {
  return prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: { include: { configuration: { include: { patchType: true, backingOption: true, borderOption: true } } } } },
  });
}

type LoadedOrder = Awaited<ReturnType<typeof loadOrder>>;

function itemsFor(order: LoadedOrder): EmailData["items"] {
  return order.items.map((i) => ({
    name: `${i.productName} × ${i.quantity.toLocaleString("en-US")}`,
    detail: `${i.configuration.widthIn}" × ${i.configuration.heightIn}" · ${i.configuration.backingOption?.name ?? "Backing TBD"}${i.totalCents ? ` · ${formatUSD(i.totalCents)}` : ""}`,
  }));
}

function crmFromOrder(order: LoadedOrder, type: CrmEventPayload["type"]): CrmEventPayload {
  const first = order.items[0]?.configuration;
  const utm = (order.utm ?? {}) as Record<string, string>;
  return {
    type,
    contact: { email: order.email, firstName: order.firstName, lastName: order.lastName, phone: order.phone, company: order.company },
    orderId: order.id,
    orderNumber: order.orderNumber,
    valueCents: order.totalCents,
    fields: {
      patch_type: first?.patchType.name, patch_size: first ? `${first.widthIn}x${first.heightIn}` : undefined, quantity: first?.quantity,
      backing: first?.backingOption?.name, border: first?.borderOption?.name, estimated_order_value: formatUSD(order.totalCents),
      lead_source: order.source.toLowerCase(), utm_source: utm.utm_source, utm_medium: utm.utm_medium, utm_campaign: utm.utm_campaign, utm_content: utm.utm_content,
      current_order_status: ORDER_STATUS_LABEL[order.status],
    },
  };
}

async function handle(event: DomainEvent) {
  switch (event.type) {
    case "mockup.submitted": {
      const req = await prisma.mockupRequest.findUniqueOrThrow({ where: { id: event.mockupRequestId }, include: { order: true, patchType: true, artworkFile: true } });
      const settings = await loadSettings();
      const url = req.orderId ? orderLink(req.orderId) : siteUrl("/track-order");
      await sendTemplatedEmail({
        template: "mockup_received", to: req.email, idempotencyKey: `mockup_received:${req.id}`, orderId: req.orderId ?? undefined,
        data: { firstName: req.name.split(" ")[0], requestNumber: req.requestNumber, url, mockup24h: settings.promises.mockup24HourPromise },
      });
      if (process.env.OPS_NOTIFICATION_EMAIL) {
        await sendTemplatedEmail({
          template: "ops_new_lead", to: process.env.OPS_NOTIFICATION_EMAIL, idempotencyKey: `ops_mockup:${req.id}`,
          data: { summary: `Free mockup ${req.requestNumber} — ${req.name}${req.company ? ` (${req.company})` : ""}`, url: siteUrl(`/admin/mockups`), items: [{ name: req.patchType?.name ?? "Patch type TBD", detail: `${req.approxSize ?? "size TBD"} · qty ${req.quantity ?? "TBD"}` }] },
        });
      }
      const utm = (req.utm ?? {}) as Record<string, string>;
      await enqueueCrmEvent(`mockup:${req.id}`, {
        type: "free_mockup_submitted",
        contact: { email: req.email, firstName: req.name.split(" ")[0], lastName: req.name.split(" ").slice(1).join(" "), phone: req.phone, company: req.company },
        orderId: req.orderId ?? undefined, orderNumber: req.order?.orderNumber,
        fields: {
          patch_type: req.patchType?.name, patch_size: req.approxSize ?? undefined, quantity: req.quantity ?? undefined, lead_source: "free_mockup",
          artwork_url: req.artworkFile ? siteUrl(`/admin/orders/${req.orderId}`) : undefined, utm_source: utm.utm_source, utm_medium: utm.utm_medium,
          utm_campaign: utm.utm_campaign, utm_content: utm.utm_content, current_order_status: "Mockup in progress",
        },
      }, { leadId: event.leadId, processNow: false });
      return;
    }
    case "quote.submitted": {
      const q = await prisma.quote.findUniqueOrThrow({ where: { id: event.quoteId } });
      await enqueueCrmEvent(`quote:${q.id}`, {
        type: "quote_submitted", contact: { email: q.email, firstName: q.firstName, lastName: q.lastName, phone: q.phone, company: q.company },
        valueCents: q.totalCents, fields: { estimated_order_value: formatUSD(q.totalCents), lead_source: "quote" },
      }, { processNow: false });
      return;
    }
    case "checkout.started": {
      const order = await loadOrder(event.orderId);
      await enqueueCrmEvent(`checkout:${order.id}`, crmFromOrder(order, "checkout_started"), { processNow: false });
      return;
    }
    case "order.paid": {
      const order = await loadOrder(event.orderId);
      await sendTemplatedEmail({
        template: "payment_confirmation", to: order.email, idempotencyKey: `payment_confirmation:${order.id}`, orderId: order.id,
        data: { firstName: order.firstName, orderNumber: order.orderNumber, totalCents: order.totalCents, items: itemsFor(order), url: orderLink(order.id) },
      });
      await enqueueCrmEvent(`order_placed:${order.id}`, crmFromOrder(order, "order_placed"), { processNow: false });
      return;
    }
    case "order.status_changed": {
      const order = await loadOrder(event.orderId);
      const template = ({ IN_PRODUCTION: "production_started", QUALITY_CHECK: "quality_check", DELIVERED: "delivered" } as const)[event.to as "IN_PRODUCTION" | "QUALITY_CHECK" | "DELIVERED"];
      if (template) {
        await sendTemplatedEmail({ template, to: order.email, idempotencyKey: `${template}:${order.id}`, orderId: order.id, data: { firstName: order.firstName, orderNumber: order.orderNumber, url: orderLink(order.id) } });
      }
      if (event.to === "DELIVERED") {
        await sendTemplatedEmail({ template: "review_request", to: order.email, idempotencyKey: `review_request:${order.id}`, orderId: order.id, data: { firstName: order.firstName, orderNumber: order.orderNumber, url: siteUrl(`/reviews/write?order=${order.id}&t=${orderAccessToken(order.id)}`) } });
      }
      return;
    }
    case "order.shipped": {
      const order = await loadOrder(event.orderId);
      const s = await prisma.shipment.findUniqueOrThrow({ where: { id: event.shipmentId } });
      await sendTemplatedEmail({
        template: "shipped", to: order.email, idempotencyKey: `shipped:${s.id}`, orderId: order.id,
        data: { firstName: order.firstName, orderNumber: order.orderNumber, carrier: s.carrier, trackingNumber: s.trackingNumber, trackingUrl: s.trackingUrl, url: orderLink(order.id) },
      });
      return;
    }
    case "proof.sent": {
      const proof = await prisma.proof.findUniqueOrThrow({ where: { id: event.proofId }, include: { orderItem: true } });
      const order = await loadOrder(proof.orderItem.orderId);
      await sendTemplatedEmail({
        template: "proof_ready", to: order.email, idempotencyKey: `proof_ready:${proof.id}`, orderId: order.id,
        data: { firstName: order.firstName, orderNumber: order.orderNumber, proofVersion: proof.version, items: (itemsFor(order) ?? []).filter((_, i) => order.items[i].id === proof.orderItemId), url: orderLink(order.id) + `#proof-${proof.orderItemId}` },
      });
      await enqueueCrmEvent(`proof_ready:${proof.id}`, crmFromOrder(order, "proof_ready"), { processNow: false });
      return;
    }
    case "proof.approved": {
      const proof = await prisma.proof.findUniqueOrThrow({ where: { id: event.proofId }, include: { orderItem: true } });
      const order = await loadOrder(proof.orderItem.orderId);
      await sendTemplatedEmail({
        template: "proof_approved", to: order.email, idempotencyKey: `proof_approved:${proof.id}`, orderId: order.id,
        data: { firstName: order.firstName, orderNumber: order.orderNumber, items: itemsFor(order), url: orderLink(order.id) },
      });
      await enqueueCrmEvent(`proof_approved:${proof.id}`, crmFromOrder(order, "proof_approved"), { processNow: false });
      return;
    }
    case "proof.revision_requested": {
      const rev = await prisma.proofRevision.findUniqueOrThrow({ where: { id: event.revisionId }, include: { proof: { include: { orderItem: true } } } });
      const order = await loadOrder(rev.proof.orderItem.orderId);
      await sendTemplatedEmail({
        template: "revision_received", to: order.email, idempotencyKey: `revision_received:${rev.id}`, orderId: order.id,
        data: { firstName: order.firstName, orderNumber: order.orderNumber, comment: rev.comment, url: orderLink(order.id) },
      });
      if (process.env.OPS_NOTIFICATION_EMAIL) {
        await sendTemplatedEmail({ template: "ops_new_lead", to: process.env.OPS_NOTIFICATION_EMAIL, idempotencyKey: `ops_revision:${rev.id}`, data: { summary: `Revision requested on ${order.orderNumber} (V${rev.proof.version})`, url: siteUrl(`/admin/orders/${order.id}`) } });
      }
      return;
    }
    case "support.requested": {
      const lead = await prisma.lead.findUniqueOrThrow({ where: { id: event.leadId } });
      await enqueueCrmEvent(`support:${lead.id}`, {
        type: "support_request", contact: { email: lead.email, firstName: lead.firstName, lastName: lead.lastName, phone: lead.phone, company: lead.company },
        fields: { lead_source: "support" },
      }, { leadId: lead.id, processNow: false });
      if (process.env.OPS_NOTIFICATION_EMAIL) {
        const p = (lead.payload ?? {}) as { message?: string; topic?: string };
        await sendTemplatedEmail({ template: "ops_new_lead", to: process.env.OPS_NOTIFICATION_EMAIL, idempotencyKey: `ops_support:${lead.id}`, data: { summary: `Support: ${p.topic ?? "General"} — ${lead.email}`, items: [{ name: p.topic ?? "Message", detail: p.message ?? "" }], url: siteUrl("/admin/customers") } });
      }
      return;
    }
    case "configurator.abandoned": {
      const cart = await prisma.cart.findUniqueOrThrow({ where: { id: event.cartId }, include: { items: { include: { configuration: { include: { patchType: true } } } } } });
      if (!cart.email) return;
      if (cart.marketingConsent) {
        await sendTemplatedEmail({
          template: "abandoned_cart", to: cart.email, idempotencyKey: `abandoned_cart:${cart.id}`,
          data: { items: cart.items.map((i) => ({ name: `${i.configuration.patchType.name} × ${i.configuration.quantity}`, detail: `${i.configuration.widthIn}" × ${i.configuration.heightIn}"` })), url: siteUrl("/cart") },
        });
      }
      const first = cart.items[0]?.configuration;
      await enqueueCrmEvent(`abandoned:${cart.id}`, {
        type: "configurator_abandoned", contact: { email: cart.email },
        fields: { patch_type: first?.patchType.name, quantity: first?.quantity, patch_size: first ? `${first.widthIn}x${first.heightIn}` : undefined, lead_source: "configurator" },
      }, { processNow: false });
      return;
    }
  }
}

export async function emit(event: DomainEvent) {
  try {
    await handle(event);
  } catch (e) {
    console.error(`[events] handler failed for ${event.type}`, e);
  }
}
