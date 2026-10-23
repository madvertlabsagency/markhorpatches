import "server-only";
import { prisma } from "@/lib/db";

/**
 * First-party funnel events. Stored server-side; forwarded to ad platforms only through the
 * conversions adapter, which strips PII and never includes artwork (see lib/analytics/conversions.ts).
 */
export const FUNNEL_EVENTS = [
  "RFQStarted",
  "RFQSubmitted",
  "RFQVerified",
  "RFQMatched",
  "SellerRegistered",
  "SellerVerified",
  "RFQPreviewViewed",
  "RFQUnlockStarted",
  "RFQUnlocked",
  "QuoteSubmitted",
  "BuyerSelectedSeller",
  "BuyerIntentConfirmed",
  "RFQQualified",
  "RFQPublished",
  "QuoteViewed",
  "QuoteRevisionRequested",
  "BuyerMessageSent",
  "SellerMessageSent",
  "RfqClosed",
  "QualityClaimSubmitted",
  "QualityCreditIssued",
] as const;
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

export async function trackEvent(name: FunnelEvent, opts: { userId?: string; orgId?: string; rfqId?: string; anonId?: string; props?: Record<string, unknown>; isDemo?: boolean } = {}) {
  try {
    await prisma.analyticsEvent.create({
      data: { name, userId: opts.userId, orgId: opts.orgId, rfqId: opts.rfqId, anonId: opts.anonId, props: opts.props ? JSON.parse(JSON.stringify(opts.props)) : undefined, isDemo: !!opts.isDemo },
    });
  } catch (e) {
    console.error("[analytics] failed to record", name, e);
  }
}
