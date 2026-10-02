/**
 * Order lifecycle state machine. The ONLY place transitions are defined.
 * Production gate: nothing moves to IN_PRODUCTION unless every item has an
 * approved proof AND the order is paid.
 */
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  QUOTE_REQUESTED: "Quote requested",
  MOCKUP_PENDING: "Mockup in progress",
  PROOF_READY: "Proof ready",
  REVISION_REQUESTED: "Revision requested",
  PROOF_APPROVED: "Proof approved",
  PAYMENT_PENDING: "Awaiting payment",
  PAID: "Paid",
  IN_PRODUCTION: "In production",
  QUALITY_CHECK: "Quality check",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["QUOTE_REQUESTED", "MOCKUP_PENDING", "PAYMENT_PENDING", "CANCELLED"],
  QUOTE_REQUESTED: ["MOCKUP_PENDING", "PAYMENT_PENDING", "CANCELLED"],
  MOCKUP_PENDING: ["PROOF_READY", "CANCELLED", "REFUNDED"],
  PROOF_READY: ["PROOF_APPROVED", "REVISION_REQUESTED", "CANCELLED", "REFUNDED"],
  REVISION_REQUESTED: ["PROOF_READY", "CANCELLED", "REFUNDED"],
  PROOF_APPROVED: ["PAYMENT_PENDING", "IN_PRODUCTION", "PROOF_READY", "CANCELLED", "REFUNDED"],
  PAYMENT_PENDING: ["PAID", "MOCKUP_PENDING", "PROOF_APPROVED", "CANCELLED"],
  PAID: ["MOCKUP_PENDING", "IN_PRODUCTION", "CANCELLED", "REFUNDED"],
  IN_PRODUCTION: ["QUALITY_CHECK", "CANCELLED", "REFUNDED"],
  QUALITY_CHECK: ["SHIPPED", "IN_PRODUCTION", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: ["REFUNDED"],
  REFUNDED: [],
};

export interface TransitionContext {
  paymentStatus: PaymentStatus;
  allProofsApproved: boolean;
}

export function allowedTransitions(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from];
}

export function canTransition(from: OrderStatus, to: OrderStatus, ctx: TransitionContext): { ok: true } | { ok: false; reason: string } {
  if (!TRANSITIONS[from].includes(to)) return { ok: false, reason: `Can't move an order from ${ORDER_STATUS_LABEL[from]} to ${ORDER_STATUS_LABEL[to]}.` };
  if (to === "IN_PRODUCTION") {
    if (!ctx.allProofsApproved) return { ok: false, reason: "Every item needs an approved proof before production." };
    if (ctx.paymentStatus !== "PAID") return { ok: false, reason: "The order must be paid before production." };
  }
  if (to === "PROOF_APPROVED" && !ctx.allProofsApproved) return { ok: false, reason: "Not all proofs are approved yet." };
  return { ok: true };
}

/** Customer-facing tracking timeline. */
export const TRACKING_STEPS = [
  { key: "received", label: "Order received" },
  { key: "artwork", label: "Artwork review" },
  { key: "proof", label: "Proof ready" },
  { key: "approved", label: "Approved" },
  { key: "production", label: "Production" },
  { key: "qc", label: "Quality check" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
] as const;

const STEP_INDEX: Record<OrderStatus, number> = {
  DRAFT: 0,
  QUOTE_REQUESTED: 0,
  PAYMENT_PENDING: 0,
  PAID: 1,
  MOCKUP_PENDING: 1,
  REVISION_REQUESTED: 1,
  PROOF_READY: 2,
  PROOF_APPROVED: 3,
  IN_PRODUCTION: 4,
  QUALITY_CHECK: 5,
  SHIPPED: 6,
  DELIVERED: 7,
  CANCELLED: -1,
  REFUNDED: -1,
};

export function trackingStepIndex(status: OrderStatus): number {
  return STEP_INDEX[status];
}

export function statusTone(status: OrderStatus): "neutral" | "info" | "action" | "success" | "danger" {
  if (status === "PROOF_READY" || status === "PAYMENT_PENDING") return "action";
  if (status === "DELIVERED" || status === "SHIPPED" || status === "PROOF_APPROVED" || status === "PAID") return "success";
  if (status === "CANCELLED" || status === "REFUNDED") return "danger";
  if (status === "DRAFT") return "neutral";
  return "info";
}
