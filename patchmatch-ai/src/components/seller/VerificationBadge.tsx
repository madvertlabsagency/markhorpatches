import { BadgeCheck, ShieldCheck, ShieldQuestion, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type SellerBadgeInput = { verificationStatus: string; identityVerifiedAt?: Date | null; capabilityReviewedAt?: Date | null };

/** Badge level from completed checks only. */
export function sellerBadgeLevel(s: SellerBadgeInput): "CAPABILITY" | "IDENTITY" | "REVIEW" | "NONE" {
  if (s.verificationStatus === "SUSPENDED" || s.verificationStatus === "REJECTED") return "NONE";
  if (s.capabilityReviewedAt) return "CAPABILITY";
  if (s.identityVerifiedAt || s.verificationStatus === "VERIFIED") return "IDENTITY";
  if (s.verificationStatus === "PENDING_REVIEW" || s.verificationStatus === "INFO_REQUIRED") return "REVIEW";
  return "NONE";
}

export const BADGE_MEANING = {
  CAPABILITY: { label: "Capability Reviewed", meaning: "Business identity verified, and our team reviewed production samples, capabilities, MOQ and turnaround. Not a guarantee of order quality." },
  IDENTITY: { label: "Identity Verified", meaning: "Business registration, contact details and factory location were checked by our team. Production capability not yet reviewed." },
  REVIEW: { label: "Under Review", meaning: "Documents submitted; our team hasn't finished reviewing them." },
  NONE: { label: "Not Verified", meaning: "No verification has been completed." },
} as const;

export function VerificationBadge({ seller, className, showMeaning }: { seller: SellerBadgeInput; className?: string; showMeaning?: boolean }) {
  const level = sellerBadgeLevel(seller);
  const m = BADGE_MEANING[level];
  const Icon = level === "CAPABILITY" ? BadgeCheck : level === "IDENTITY" ? ShieldCheck : level === "REVIEW" ? Clock : ShieldQuestion;
  const tone = level === "CAPABILITY" ? "bg-green/12 text-green ring-green/25" : level === "IDENTITY" ? "bg-electric/10 text-[#B93C0A] ring-electric/25 dark:text-[#FF8A5B]" : "bg-surface-2 text-muted ring-line";
  return (
    <span className={cn("inline-flex flex-col", className)}>
      <span title={m.meaning} className={cn("inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", tone)}>
        <Icon className="h-3.5 w-3.5" aria-hidden /> {m.label}
      </span>
      {showMeaning && <span className="mt-1 text-xs text-muted">{m.meaning}</span>}
    </span>
  );
}
