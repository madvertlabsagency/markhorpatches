import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { payments } from "@/lib/services/payments";
import { markPaymentFailed, markPaymentSucceeded } from "@/lib/domain/orders";

/** Stripe webhook. Signature-verified, idempotent (ProcessedWebhook), amount-verified in markPaymentSucceeded. */
export async function POST(req: Request) {
  const raw = await req.text();
  let event;
  try {
    event = await payments().parseWebhook(raw, req.headers.get("stripe-signature"));
  } catch (e) {
    console.warn("[stripe webhook] rejected", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  try {
    await prisma.processedWebhook.create({ data: { provider: "stripe", eventId: event.id, type: event.type } });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }
  try {
    if (event.type === "payment.succeeded") await markPaymentSucceeded(event.providerRef, event.amountCents);
    if (event.type === "payment.failed") await markPaymentFailed(event.providerRef, "Checkout expired or failed");
    if (event.type === "payment.refunded" && event.orderId) {
      await prisma.order.update({ where: { id: event.orderId }, data: { paymentStatus: "REFUNDED" } }).catch(() => {});
    }
  } catch (e) {
    // Let Stripe retry: remove the idempotency marker.
    await prisma.processedWebhook.deleteMany({ where: { provider: "stripe", eventId: event.id } });
    console.error("[stripe webhook] handler failed", e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
