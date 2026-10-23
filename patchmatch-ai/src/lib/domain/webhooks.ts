import "server-only";
import { prisma } from "@/lib/db";
import { providerByName } from "@/lib/services/payments";
import { applyProviderPaymentStatus } from "@/lib/domain/unlock";
import { Prisma } from "@/generated/prisma/client";

/**
 * Inbound payment webhook pipeline: verify signature on the RAW body → persist (deduplicated by
 * provider event id) → apply. Unsigned/invalid events are recorded for forensics but never applied.
 */
export async function handlePaymentWebhook(providerName: string, rawBody: string, headers: Headers): Promise<{ status: number; body: Record<string, unknown> }> {
  const provider = providerByName(providerName);
  if (!provider || !provider.configured || !provider.capabilities.signedWebhooks) return { status: 404, body: { error: "Unknown provider" } };
  const verified = await provider.verifyWebhook(rawBody, headers);
  if (!verified.valid || !verified.event) {
    await prisma.webhookEvent
      .create({ data: { provider: providerName, eventId: `invalid:${Date.now()}:${Math.random().toString(36).slice(2)}`, type: "invalid", signatureValid: false, payload: { length: rawBody.length }, error: verified.error ?? "invalid" } })
      .catch(() => {});
    return { status: 400, body: { error: "Invalid signature" } };
  }
  const ev = verified.event;
  try {
    await prisma.webhookEvent.create({ data: { provider: providerName, eventId: ev.eventId, type: ev.type, signatureValid: true, payload: JSON.parse(JSON.stringify(ev)) } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const prior = await prisma.webhookEvent.findUnique({ where: { provider_eventId: { provider: providerName, eventId: ev.eventId } } });
      if (prior?.processedAt) return { status: 200, body: { duplicate: true } };
    } else throw e;
  }
  try {
    const result = await applyProviderPaymentStatus(providerName, ev.providerRef, ev.status, ev.amountMinor, ev.currency, `webhook:${ev.eventId}`);
    await prisma.webhookEvent.update({ where: { provider_eventId: { provider: providerName, eventId: ev.eventId } }, data: { processedAt: new Date(), error: result.ok ? null : result.reason } });
    return { status: 200, body: { received: true } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.webhookEvent.update({ where: { provider_eventId: { provider: providerName, eventId: ev.eventId } }, data: { error: msg.slice(0, 1000) } });
    // 500 → provider retries; processing is idempotent.
    return { status: 500, body: { error: "Processing failed" } };
  }
}
