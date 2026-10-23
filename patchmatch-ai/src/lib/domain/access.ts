import "server-only";
import { prisma } from "@/lib/db";
import { projectRfqForSeller, type SellerRfqView } from "@/lib/rfq/disclosure";
import { storage } from "@/lib/services/storage";
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient | typeof prisma;

/**
 * Seller → RFQ access rules (authoritative; every seller page and action goes through here).
 *  • Preview: seller is verified and either (a) has an eligible, non-rejected, NOTIFIED/APPROVED match
 *    for an EXCLUSIVE/LIMITED opportunity, or (b) holds an invitation/assignment for a
 *    PRIVATE_INVITATION/ADMIN_ASSIGNMENT opportunity — or already has an unlock.
 *  • Full details: only with an ACTIVE RfqUnlock row for this seller.
 */
export async function sellerAccess(sellerId: string, rfqId: string, tx: Tx = prisma) {
  // Sequential: inside an interactive transaction the queries share one connection.
  const seller = await tx.sellerProfile.findUnique({ where: { id: sellerId }, select: { verificationStatus: true, availability: true } });
  const opportunity = await tx.opportunity.findUnique({ where: { rfqId } });
  const match = await tx.rfqMatch.findUnique({ where: { rfqId_sellerId: { rfqId, sellerId } } });
  const assignment = await tx.rfqAssignment.findUnique({ where: { rfqId_sellerId: { rfqId, sellerId } } });
  const unlock = await tx.rfqUnlock.findUnique({ where: { rfqId_sellerId: { rfqId, sellerId } } });
  const unlocked = unlock?.status === "ACTIVE";
  const verified = seller?.verificationStatus === "VERIFIED";
  let listed = false;
  if (opportunity && verified && opportunity.status !== "DRAFT" && opportunity.status !== "WITHDRAWN") {
    if (opportunity.distributionMode === "EXCLUSIVE" || opportunity.distributionMode === "LIMITED_SHARED") {
      listed = !!match && match.eligible && (match.status === "NOTIFIED" || match.status === "APPROVED");
    } else {
      listed = !!assignment && !!match?.eligible;
    }
  }
  const canView = unlocked || listed;
  const purchasable = listed && !unlocked && opportunity?.status === "AVAILABLE" && seller?.availability === "ACTIVE" && (!opportunity.expiresAt || opportunity.expiresAt > new Date());
  return { canView, unlocked, unlock, opportunity, match, assignment, purchasable, verified };
}

const rfqInclude = {
  spec: true,
  artwork: { include: { attachment: true }, orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.RfqInclude;

export type SellerRfqPage = SellerRfqView & {
  artwork: { id: string; name: string; type: string; url: string | null; downloadUrl: string | null }[];
  status: string;
};

/** Returns the seller's view of an RFQ, or null when the seller has no access. */
export async function sellerRfqView(sellerId: string, rfqId: string): Promise<{ view: SellerRfqPage; access: Awaited<ReturnType<typeof sellerAccess>> } | null> {
  const access = await sellerAccess(sellerId, rfqId);
  if (!access.canView) return null;
  const rfq = await prisma.rfq.findUnique({ where: { id: rfqId }, include: rfqInclude });
  if (!rfq) return null;
  const conversation = access.unlocked ? await prisma.conversation.findUnique({ where: { rfqId_sellerId: { rfqId, sellerId } }, select: { contactSharedAt: true } }) : null;
  const view = projectRfqForSeller(rfq, { unlocked: access.unlocked, contactShared: !!conversation?.contactSharedAt });
  const s = storage();
  const artwork = await Promise.all(
    rfq.artwork
      .filter((a) => a.attachment.status === "READY")
      .map(async (a, i) => {
        const att = a.attachment;
        if (!access.unlocked) {
          // Locked: blurred, metadata-free teaser only. Never the original.
          return { id: att.id, name: `Artwork ${i + 1}`, type: att.extension.toUpperCase(), url: att.teaserKey ? await s.getDownloadUrl(att.teaserKey, { inline: true, expiresIn: 600 }) : null, downloadUrl: null };
        }
        return {
          id: att.id,
          name: att.originalFilename,
          type: att.extension.toUpperCase(),
          url: att.previewKey ? await s.getDownloadUrl(att.previewKey, { inline: true, expiresIn: 600 }) : null,
          downloadUrl: `/api/files/${att.id}`,
        };
      }),
  );
  return { view: { ...view, artwork, status: rfq.status }, access };
}
