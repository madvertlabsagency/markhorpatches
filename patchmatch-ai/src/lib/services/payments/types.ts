export type ProviderPaymentStatus = "PENDING" | "REQUIRES_AUTHENTICATION" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";

export interface ProviderCapabilities {
  hostedCheckout: boolean;
  savedPaymentMethods: boolean;
  /** Merchant-initiated charges without the payer present. Must be approved by the acquirer. */
  offSessionCharges: boolean;
  refunds: boolean;
  signedWebhooks: boolean;
}

export interface CheckoutRequest {
  paymentId: string;
  amountMinor: number;
  currency: string;
  description: string;
  customerEmail: string;
  returnUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
}

export interface CheckoutSession {
  providerRef: string;
  checkoutUrl: string;
  status: ProviderPaymentStatus;
}

export interface ProviderPayment {
  providerRef: string;
  status: ProviderPaymentStatus;
  amountMinor: number;
  currency: string;
}

export interface WebhookEventParsed {
  eventId: string;
  type: string;
  providerRef: string;
  status: ProviderPaymentStatus;
  amountMinor: number;
  currency: string;
}

export interface PaymentProvider {
  readonly name: string;
  readonly displayName: string;
  readonly configured: boolean;
  readonly capabilities: ProviderCapabilities;
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  retrieve(providerRef: string): Promise<ProviderPayment | null>;
  refund(input: { providerRef: string; amountMinor: number; idempotencyKey: string }): Promise<{ refundRef: string; status: "PROCESSED" | "PENDING" | "FAILED" }>;
  /** Verifies the signature and parses the event. Must be called with the RAW request body. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<{ valid: boolean; event?: WebhookEventParsed; error?: string }>;
}

export class ProviderNotIntegratedError extends Error {
  constructor(provider: string) {
    super(
      `${provider} is not integrated yet. It requires an approved merchant account and the provider's official API documentation. ` +
        "Use prepaid credits or a manual invoice until then (see docs/PRODUCTION_READINESS.md).",
    );
  }
}
