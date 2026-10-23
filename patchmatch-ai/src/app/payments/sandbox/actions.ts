"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { verifyPayload } from "@/lib/crypto";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { paymentProvider } from "@/lib/services/payments";
import { buildSandboxEvent, SANDBOX_SIGNATURE_HEADER } from "@/lib/services/payments/sandbox";
import { handlePaymentWebhook } from "@/lib/domain/webhooks";

/**
 * Plays the role of the gateway: emits a signed event that goes through the exact same webhook
 * verification and processing path as a real provider callback.
 */
export async function simulateSandboxAction(token: string, outcome: "PAID" | "FAILED" | "CANCELLED") {
  if (paymentProvider().name !== "sandbox") throw new Error("Sandbox disabled");
  const data = verifyPayload<{ providerRef: string; paymentId: string; amountMinor: number; currency: string; returnUrl: string; cancelUrl: string }>(token);
  if (!data) throw new Error("Checkout session expired");
  const user = await getCurrentUser();
  const payment = await prisma.payment.findUnique({ where: { id: data.paymentId } });
  if (!payment || !user || !user.memberships.some((m) => m.orgId === payment.orgId)) throw new Error("Not allowed");
  const { body, signature } = buildSandboxEvent(data.providerRef, outcome, data.amountMinor, data.currency);
  await handlePaymentWebhook("sandbox", body, new Headers({ [SANDBOX_SIGNATURE_HEADER]: signature, "x-forwarded-for": (await headers()).get("x-forwarded-for") ?? "" }));
  const target = outcome === "CANCELLED" ? data.cancelUrl : data.returnUrl;
  redirect(new URL(target).pathname + new URL(target).search);
}
