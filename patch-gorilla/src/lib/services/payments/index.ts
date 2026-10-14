import "server-only";
import { env } from "@/lib/env";
import { createStripeAdapter } from "./stripe";
import { mockPaymentAdapter } from "./mock";
import type { PaymentAdapter } from "./types";

let adapter: PaymentAdapter | null = null;

export function payments(): PaymentAdapter {
  if (adapter) return adapter;
  const e = env();
  adapter = e.PAYMENTS_PROVIDER === "stripe" ? createStripeAdapter() : mockPaymentAdapter;
  return adapter;
}

export type { PaymentAdapter };
