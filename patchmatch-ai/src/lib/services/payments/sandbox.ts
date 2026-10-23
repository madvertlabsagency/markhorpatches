import "server-only";
import { createHmac } from "node:crypto";
import { prisma } from "@/lib/db";
import { randomToken, safeEqual, signPayload } from "@/lib/crypto";
import type { PaymentProvider, ProviderPaymentStatus, WebhookEventParsed } from "./types";

/**
 * SANDBOX GATEWAY — a simulated hosted checkout for development, demos and automated tests.
 * It behaves like a real gateway from the platform's point of view: the platform redirects to a
 * hosted page, the "gateway" posts an HMAC-signed webhook, and the platform verifies the signature
 * and the amount before granting anything. No real money moves. Refused in production unless
 * ALLOW_SANDBOX_PAYMENTS=true (see lib/env.ts).
 *
 * The gateway's own record of each charge is its signed event log (WebhookEvent rows with
 * provider = "sandbox"), which `retrieve` reads for reconciliation.
 */

export const SANDBOX_SIGNATURE_HEADER = "x-sandbox-signature";

export function sandboxSecret() {
  return process.env.SANDBOX_WEBHOOK_SECRET || `sandbox:${process.env.APP_SECRET ?? ""}`;
}

export function signSandboxBody(body: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", sandboxSecret()).update(`${ts}.${body}`).digest("hex");
  return `t=${ts},v1=${sig}`;
}

export function buildSandboxEvent(providerRef: string, status: ProviderPaymentStatus, amountMinor: number, currency: string) {
  const event: WebhookEventParsed = { eventId: `evt_${randomToken(12)}`, type: `payment.${status.toLowerCase()}`, providerRef, status, amountMinor, currency };
  const body = JSON.stringify(event);
  return { body, signature: signSandboxBody(body) };
}

export const sandboxProvider: PaymentProvider = {
  name: "sandbox",
  displayName: "Sandbox (test mode — no real charges)",
  configured: true,
  capabilities: { hostedCheckout: true, savedPaymentMethods: false, offSessionCharges: false, refunds: true, signedWebhooks: true },

  async createCheckout(req) {
    const providerRef = `sbx_${randomToken(12)}`;
    const token = signPayload({ providerRef, paymentId: req.paymentId, amountMinor: req.amountMinor, currency: req.currency, returnUrl: req.returnUrl, cancelUrl: req.cancelUrl }, 30 * 60);
    return { providerRef, checkoutUrl: `/payments/sandbox?token=${encodeURIComponent(token)}`, status: "PENDING" };
  },

  async retrieve(providerRef) {
    const last = await prisma.webhookEvent.findFirst({
      where: { provider: "sandbox", signatureValid: true, payload: { path: ["providerRef"], equals: providerRef } },
      orderBy: { createdAt: "desc" },
    });
    if (!last) return null;
    const ev = last.payload as unknown as WebhookEventParsed;
    return { providerRef, status: ev.status, amountMinor: ev.amountMinor, currency: ev.currency };
  },

  async refund({ providerRef }) {
    return { refundRef: `sbx_rf_${providerRef.slice(4, 12)}_${randomToken(6)}`, status: "PROCESSED" };
  },

  async verifyWebhook(rawBody, headers) {
    const header = headers.get(SANDBOX_SIGNATURE_HEADER) ?? "";
    const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
    const ts = Number(parts.t);
    if (!parts.v1 || !Number.isFinite(ts)) return { valid: false, error: "Missing signature" };
    if (Math.abs(Date.now() / 1000 - ts) > 300) return { valid: false, error: "Signature timestamp outside tolerance" };
    const expected = createHmac("sha256", sandboxSecret()).update(`${ts}.${rawBody}`).digest("hex");
    if (!safeEqual(parts.v1, expected)) return { valid: false, error: "Invalid signature" };
    try {
      const event = JSON.parse(rawBody) as WebhookEventParsed;
      if (!event.eventId || !event.providerRef || !event.status) return { valid: false, error: "Malformed event" };
      return { valid: true, event };
    } catch {
      return { valid: false, error: "Invalid JSON" };
    }
  },
};
