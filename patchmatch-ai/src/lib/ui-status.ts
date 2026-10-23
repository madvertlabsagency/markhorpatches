import type { BadgeTone } from "@/components/ui/primitives";
import { titleCase } from "@/lib/utils";

const RFQ: Record<string, BadgeTone> = {
  DRAFT: "neutral", SUBMITTED: "blue", VERIFICATION_PENDING: "amber", UNDER_REVIEW: "blue", CLARIFICATION_REQUIRED: "amber", QUALIFIED: "green", MATCHING: "blue",
  MANUAL_SOURCING: "amber", SELLER_NOTIFIED: "blue", QUOTES_RECEIVED: "green", SELLER_SELECTED: "green", CLOSED: "neutral", CANCELLED: "neutral", EXPIRED: "neutral",
};
const OPP: Record<string, BadgeTone> = { DRAFT: "neutral", AVAILABLE: "green", PAUSED: "amber", SOLD_OUT: "dark", EXPIRED: "neutral", WITHDRAWN: "red" };
const PAY: Record<string, BadgeTone> = { CREATED: "neutral", PENDING: "amber", REQUIRES_AUTHENTICATION: "amber", PROCESSING: "blue", PAID: "green", FAILED: "red", CANCELLED: "neutral", REFUNDED: "violet", DISPUTED: "red" };
const QUOTE: Record<string, BadgeTone> = { DRAFT: "neutral", SUBMITTED: "blue", VIEWED: "blue", CLARIFICATION_REQUESTED: "amber", REVISED: "blue", ACCEPTED: "green", REJECTED: "red", EXPIRED: "neutral", WITHDRAWN: "neutral" };
const VER: Record<string, BadgeTone> = { UNVERIFIED: "neutral", PENDING_REVIEW: "blue", INFO_REQUIRED: "amber", VERIFIED: "green", SUSPENDED: "red", REJECTED: "red" };
const TIER: Record<string, BadgeTone> = { A: "green", B: "blue", C: "amber", D: "red" };
const DISPUTE: Record<string, BadgeTone> = { OPEN: "amber", UNDER_REVIEW: "blue", RESOLVED_CREDIT: "green", RESOLVED_REFUND: "green", REJECTED: "neutral" };

const MAPS = { rfq: RFQ, opp: OPP, pay: PAY, quote: QUOTE, ver: VER, tier: TIER, dispute: DISPUTE };

export function statusTone(kind: keyof typeof MAPS, status: string): BadgeTone {
  return MAPS[kind][status] ?? "neutral";
}

export function statusLabel(status: string) {
  if (status === "INFO_REQUIRED") return "Info required";
  if (status === "SELLER_NOTIFIED") return "Sellers notified";
  return titleCase(status);
}
