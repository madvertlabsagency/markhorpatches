import "server-only";
import { signPayload } from "@/lib/crypto";
import type { PaymentAdapter } from "./types";

/** Development/test provider: a signed link to /checkout/mock-pay that simulates a successful payment. */
export const mockPaymentAdapter: PaymentAdapter = {
  provider: "MOCK",
  async createCheckout(i) {
    const providerRef = `mock_${i.idempotencyKey}`;
    const token = signPayload({ orderId: i.orderId, providerRef, amountCents: i.totalCents, successUrl: i.successUrl, cancelUrl: i.cancelUrl }, 3600);
    return { redirectUrl: `/checkout/mock-pay?token=${encodeURIComponent(token)}`, providerRef };
  },
  async parseWebhook() {
    throw new Error("Mock provider has no webhooks");
  },
};
