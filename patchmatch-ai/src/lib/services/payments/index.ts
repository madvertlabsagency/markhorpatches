import "server-only";
import { ProviderNotIntegratedError, type PaymentProvider } from "./types";
import { sandboxProvider } from "./sandbox";

/**
 * Pakistani gateways under consideration. Their APIs, tokenisation and refund support must be
 * confirmed from official documentation and merchant approval before implementation — the
 * adapters below deliberately implement nothing and report `configured: false`.
 */
function pendingProvider(name: string, displayName: string): PaymentProvider {
  const fail = async (): Promise<never> => {
    throw new ProviderNotIntegratedError(displayName);
  };
  return {
    name,
    displayName,
    configured: false,
    capabilities: { hostedCheckout: false, savedPaymentMethods: false, offSessionCharges: false, refunds: false, signedWebhooks: false },
    createCheckout: fail,
    retrieve: fail,
    refund: fail,
    verifyWebhook: async () => ({ valid: false, error: `${displayName} webhooks are not integrated` }),
  };
}

/** Manual mode: no card checkout. Sellers pay via issued invoices → prepaid credits. */
const manualProvider: PaymentProvider = {
  ...pendingProvider("manual", "Manual invoice / bank transfer"),
  configured: true,
  async createCheckout() {
    throw new Error("Card checkout is not enabled. Use prepaid credits — request an invoice from Billing.");
  },
  async retrieve() {
    return null;
  },
};

const PROVIDERS: Record<string, PaymentProvider> = {
  sandbox: sandboxProvider,
  manual: manualProvider,
  safepay: pendingProvider("safepay", "Safepay (Pakistan)"),
  payfast: pendingProvider("payfast", "Premier PayFast"),
  faysal: pendingProvider("faysal", "Faysal Bank payment gateway"),
};

export function paymentProvider(name = process.env.PAYMENTS_PROVIDER ?? "sandbox"): PaymentProvider {
  if (name === "sandbox" && process.env.NODE_ENV === "production" && process.env.ALLOW_SANDBOX_PAYMENTS !== "true") {
    return manualProvider;
  }
  return PROVIDERS[name] ?? manualProvider;
}

export function providerByName(name: string): PaymentProvider | null {
  return PROVIDERS[name] ?? null;
}

export function cardCheckoutAvailable() {
  const p = paymentProvider();
  return p.configured && p.capabilities.hostedCheckout;
}

export function allProviders() {
  return Object.values(PROVIDERS);
}
