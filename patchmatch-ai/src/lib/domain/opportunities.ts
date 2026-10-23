import "server-only";
import { prisma } from "@/lib/db";
import { redactContactInfo } from "@/lib/rfq/disclosure";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Anonymised opportunity cards for a seller. Only listings the seller is entitled to see
 * (eligible + notified/approved match, or invitation/assignment) are returned, and only
 * non-identifying fields are selected — contact fields are never read here.
 */
export async function listSellerOpportunities(sellerId: string, filter: { status?: "open" | "all"; patchType?: string } = {}) {
  const visibility: Prisma.RfqWhereInput = {
    OR: [
      { opportunity: { distributionMode: { in: ["EXCLUSIVE", "LIMITED_SHARED"] } }, matches: { some: { sellerId, eligible: true, status: { in: ["NOTIFIED", "APPROVED"] } } } },
      { opportunity: { distributionMode: { in: ["PRIVATE_INVITATION", "ADMIN_ASSIGNMENT"] } }, assignments: { some: { sellerId } }, matches: { some: { sellerId, eligible: true } } },
    ],
  };
  const rfqs = await prisma.rfq.findMany({
    where: {
      AND: [
        visibility,
        { opportunity: { status: filter.status === "all" ? { notIn: ["DRAFT", "WITHDRAWN"] } : "AVAILABLE" } },
        filter.status === "all" ? {} : { unlocks: { none: { sellerId, status: "ACTIVE" } } },
        filter.patchType ? { patchType: filter.patchType as never } : {},
      ],
    },
    select: {
      id: true, publicRef: true, patchType: true, intendedUse: true, createdAt: true, disclosureMode: true, isDemo: true,
      spec: { select: { width: true, height: true, unit: true, quantity: true, backing: true, destinationCountry: true, destinationState: true, requiredBy: true, rush: true, budgetUndisclosed: true, budgetTotalMinor: true, aiSummary: true } },
      opportunity: true,
      qualifications: { where: { isCurrent: true }, select: { tier: true, pricingTier: true } },
      matches: { where: { sellerId }, select: { score: true, explanation: true } },
      artwork: { select: { attachmentId: true, attachment: { select: { teaserKey: true, status: true } } }, orderBy: { sortOrder: "asc" }, take: 1 },
      unlocks: { where: { sellerId, status: "ACTIVE" }, select: { id: true } },
      reservations: { where: { status: "ACTIVE", expiresAt: { gt: new Date() } }, select: { sellerId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rfqs.map((r) => ({
    id: r.id,
    ref: r.publicRef,
    patchType: r.patchType,
    intendedUse: r.intendedUse,
    createdAt: r.createdAt,
    isDemo: r.isDemo,
    messagingOnly: r.disclosureMode === "PLATFORM_MESSAGING_ONLY",
    quantity: r.spec?.quantity ?? 0,
    size: r.spec?.width && r.spec?.height ? `${r.spec.width}×${r.spec.height} ${r.spec.unit.toLowerCase()}` : null,
    region: [r.spec?.destinationState, r.spec?.destinationCountry].filter(Boolean).join(", "),
    requiredBy: r.spec?.requiredBy ?? null,
    rush: r.spec?.rush ?? false,
    budgetMinor: r.spec && !r.spec.budgetUndisclosed ? r.spec.budgetTotalMinor : null,
    summary: redactContactInfo(r.spec?.aiSummary).text || null,
    tier: r.qualifications[0]?.tier ?? null,
    pricingTier: r.qualifications[0]?.pricingTier ?? null,
    score: r.matches[0]?.score ?? null,
    priceMinor: r.opportunity!.priceMinor,
    currency: r.opportunity!.currency,
    mode: r.opportunity!.distributionMode,
    oppStatus: r.opportunity!.status,
    remaining: r.opportunity!.maxUnlocks - r.opportunity!.unlockCount,
    maxUnlocks: r.opportunity!.maxUnlocks,
    reservedByOther: r.reservations.some((x) => x.sellerId !== sellerId),
    expiresAt: r.opportunity!.expiresAt,
    teaserId: r.artwork[0]?.attachment.status === "READY" && r.artwork[0].attachment.teaserKey ? r.artwork[0].attachmentId : null,
    unlocked: r.unlocks.length > 0,
  }));
}

export type OpportunityCardData = Awaited<ReturnType<typeof listSellerOpportunities>>[number];
