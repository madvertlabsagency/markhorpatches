/**
 * Explicit state machines. Every status change in the domain layer goes through
 * `assertTransition`, so illegal jumps (e.g. FAILED → PAID without a new attempt) are rejected.
 */

type Machine<S extends string> = Record<S, readonly S[]>;

export const RFQ_TRANSITIONS: Machine<
  | "DRAFT" | "SUBMITTED" | "VERIFICATION_PENDING" | "UNDER_REVIEW" | "CLARIFICATION_REQUIRED" | "QUALIFIED" | "MATCHING" | "MANUAL_SOURCING"
  | "SELLER_NOTIFIED" | "QUOTES_RECEIVED" | "SELLER_SELECTED" | "CLOSED" | "CANCELLED" | "EXPIRED"
> = {
  DRAFT: ["SUBMITTED", "VERIFICATION_PENDING", "CANCELLED"],
  SUBMITTED: ["VERIFICATION_PENDING", "UNDER_REVIEW", "CANCELLED"],
  VERIFICATION_PENDING: ["UNDER_REVIEW", "CANCELLED", "EXPIRED"],
  UNDER_REVIEW: ["QUALIFIED", "CLARIFICATION_REQUIRED", "CLOSED", "CANCELLED"],
  CLARIFICATION_REQUIRED: ["UNDER_REVIEW", "CANCELLED", "EXPIRED", "CLOSED"],
  QUALIFIED: ["MATCHING", "UNDER_REVIEW", "CANCELLED", "CLOSED"],
  MATCHING: ["SELLER_NOTIFIED", "MANUAL_SOURCING", "UNDER_REVIEW", "CANCELLED", "CLOSED"],
  MANUAL_SOURCING: ["MATCHING", "SELLER_NOTIFIED", "CLOSED", "CANCELLED", "EXPIRED"],
  SELLER_NOTIFIED: ["QUOTES_RECEIVED", "MATCHING", "MANUAL_SOURCING", "CLOSED", "CANCELLED", "EXPIRED"],
  QUOTES_RECEIVED: ["SELLER_SELECTED", "CLOSED", "CANCELLED", "EXPIRED"],
  SELLER_SELECTED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
  EXPIRED: ["UNDER_REVIEW"],
};

export const OPPORTUNITY_TRANSITIONS: Machine<"DRAFT" | "AVAILABLE" | "PAUSED" | "SOLD_OUT" | "EXPIRED" | "WITHDRAWN"> = {
  DRAFT: ["AVAILABLE", "WITHDRAWN"],
  AVAILABLE: ["PAUSED", "SOLD_OUT", "EXPIRED", "WITHDRAWN"],
  PAUSED: ["AVAILABLE", "WITHDRAWN", "EXPIRED"],
  SOLD_OUT: ["AVAILABLE"], // only when an unlock is refunded/revoked and capacity frees up
  EXPIRED: ["AVAILABLE", "WITHDRAWN"],
  WITHDRAWN: [],
};

export const PAYMENT_TRANSITIONS: Machine<"CREATED" | "PENDING" | "REQUIRES_AUTHENTICATION" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED" | "DISPUTED"> = {
  CREATED: ["PENDING", "REQUIRES_AUTHENTICATION", "PROCESSING", "PAID", "FAILED", "CANCELLED"],
  PENDING: ["REQUIRES_AUTHENTICATION", "PROCESSING", "PAID", "FAILED", "CANCELLED"],
  REQUIRES_AUTHENTICATION: ["PROCESSING", "PAID", "FAILED", "CANCELLED"],
  PROCESSING: ["PAID", "FAILED", "CANCELLED"],
  PAID: ["REFUNDED", "DISPUTED"],
  FAILED: [],
  CANCELLED: [],
  REFUNDED: [],
  DISPUTED: ["PAID", "REFUNDED"],
};

export const QUOTE_TRANSITIONS: Machine<"DRAFT" | "SUBMITTED" | "VIEWED" | "CLARIFICATION_REQUESTED" | "REVISED" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "WITHDRAWN"> = {
  DRAFT: ["SUBMITTED", "WITHDRAWN"],
  SUBMITTED: ["VIEWED", "CLARIFICATION_REQUESTED", "REVISED", "ACCEPTED", "REJECTED", "EXPIRED", "WITHDRAWN"],
  VIEWED: ["CLARIFICATION_REQUESTED", "REVISED", "ACCEPTED", "REJECTED", "EXPIRED", "WITHDRAWN"],
  CLARIFICATION_REQUESTED: ["REVISED", "WITHDRAWN", "REJECTED", "EXPIRED"],
  REVISED: ["VIEWED", "CLARIFICATION_REQUESTED", "REVISED", "ACCEPTED", "REJECTED", "EXPIRED", "WITHDRAWN"],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
  WITHDRAWN: [],
};

export const VERIFICATION_TRANSITIONS: Machine<"UNVERIFIED" | "PENDING_REVIEW" | "INFO_REQUIRED" | "VERIFIED" | "SUSPENDED" | "REJECTED"> = {
  UNVERIFIED: ["PENDING_REVIEW"],
  PENDING_REVIEW: ["VERIFIED", "INFO_REQUIRED", "REJECTED"],
  INFO_REQUIRED: ["PENDING_REVIEW", "REJECTED"],
  VERIFIED: ["SUSPENDED", "PENDING_REVIEW"],
  SUSPENDED: ["VERIFIED", "REJECTED"],
  REJECTED: ["PENDING_REVIEW"],
};

export class TransitionError extends Error {
  constructor(public machine: string, public from: string, public to: string) {
    super(`Illegal ${machine} transition ${from} → ${to}`);
  }
}

export function canTransition<S extends string>(machine: Machine<S>, from: S, to: S): boolean {
  return from === to || (machine[from]?.includes(to) ?? false);
}

export function assertTransition<S extends string>(name: string, machine: Machine<S>, from: S, to: S) {
  if (!canTransition(machine, from, to)) throw new TransitionError(name, from, to);
}

/** Buyer-friendly labels and colours for statuses. */
export const RFQ_STATUS_LABEL: Record<keyof typeof RFQ_TRANSITIONS, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  VERIFICATION_PENDING: "Verification pending",
  UNDER_REVIEW: "Under review",
  CLARIFICATION_REQUIRED: "Clarification required",
  QUALIFIED: "Qualified",
  MATCHING: "Matching",
  MANUAL_SOURCING: "Manual sourcing",
  SELLER_NOTIFIED: "Sellers notified",
  QUOTES_RECEIVED: "Quotes received",
  SELLER_SELECTED: "Seller selected",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

export const BUYER_EDITABLE_STATUSES = ["DRAFT", "SUBMITTED", "VERIFICATION_PENDING", "UNDER_REVIEW", "CLARIFICATION_REQUIRED"] as const;
export const RFQ_TERMINAL = ["CLOSED", "CANCELLED", "EXPIRED"] as const;
