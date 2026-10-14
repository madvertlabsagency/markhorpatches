export interface CheckoutLine {
  name: string;
  description: string;
  /** Line total in cents (quantity is baked into the description; Stripe line uses quantity 1). */
  amountCents: number;
}

export interface CreateCheckoutInput {
  orderId: string;
  orderNumber: string;
  email: string;
  lines: CheckoutLine[];
  shippingCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
}

export interface PaymentEvent {
  id: string;
  type: "payment.succeeded" | "payment.failed" | "payment.refunded" | "ignored";
  providerRef: string;
  orderId?: string;
  amountCents?: number;
}

export interface PaymentAdapter {
  readonly provider: "STRIPE" | "MOCK";
  createCheckout(input: CreateCheckoutInput): Promise<{ redirectUrl: string; providerRef: string }>;
  parseWebhook(rawBody: string, signature: string | null): Promise<PaymentEvent>;
}
