import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { storage } from "@/lib/services/storage";
import { FILE_TYPES, PURPOSE_RULES, sniffMatches, svgIsSafe, type UploadPurpose } from "@/lib/services/storage/validation";
import { generatePreviews } from "@/lib/services/storage/previews";
import { getCurrentUser, membershipOf, type CurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { sellerAccess } from "@/lib/domain/access";
import type { Attachment } from "@/generated/prisma/client";

export const GUEST_COOKIE = "pm_guest";

/** Anonymous owner identity for wizard uploads before sign-in (httpOnly, 7 days). */
export async function guestOwnerHash(create = false): Promise<string | null> {
  const jar = await cookies();
  let token = jar.get(GUEST_COOKIE)?.value;
  if (!token && create) {
    token = randomToken(24);
    jar.set(GUEST_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 7 * 86_400, path: "/" });
  }
  return token ? sha256(token) : null;
}

/** Verify an uploaded object: exists, size within limit, bytes match the claimed type, SVG has no active content. */
export async function verifyAndFinalize(att: Attachment): Promise<{ ok: true; att: Attachment } | { ok: false; reason: string }> {
  const s = storage();
  const max = PURPOSE_RULES[att.purpose as UploadPurpose].maxMb * 1_048_576;
  const head = await s.head(att.storageKey);
  const reject = async (reason: string) => {
    await s.delete(att.storageKey).catch(() => {});
    await prisma.attachment.update({ where: { id: att.id }, data: { status: "REJECTED", rejectionReason: reason } });
    return { ok: false as const, reason };
  };
  if (!head) return { ok: false, reason: "We didn't receive the file. Please try uploading again." };
  if (head.size === 0 || head.size > max) return reject(`The file is ${(head.size / 1_048_576).toFixed(1)} MB — the limit is ${PURPOSE_RULES[att.purpose as UploadPurpose].maxMb} MB.`);
  const bytes = await s.readHead(att.storageKey, 1024);
  if (!sniffMatches(att.extension, bytes)) return reject(`The file contents don't look like a valid .${att.extension} file.`);

  let previewKey: string | null = null;
  let teaserKey: string | null = null;
  let digest: string | null = null;
  let scanStatus: "NOT_SCANNED" | "UNSUPPORTED" = "NOT_SCANNED";
  if (head.size <= 30 * 1_048_576) {
    const full = await s.read(att.storageKey);
    digest = sha256(full);
    if (att.extension === "svg" && !svgIsSafe(full.toString("utf8"))) return reject("This SVG contains scripts or external references and can't be accepted. Export it as PDF or PNG.");
    if (FILE_TYPES[att.extension]?.raster && (att.purpose === "RFQ_ARTWORK" || att.purpose === "PORTFOLIO" || att.purpose === "MESSAGE_ATTACHMENT" || att.purpose === "QUOTE_ATTACHMENT")) {
      try {
        const p = await generatePreviews(full);
        previewKey = `${att.storageKey}.preview.webp`;
        await s.put(previewKey, p.preview, "image/webp");
        if (att.purpose === "RFQ_ARTWORK") {
          teaserKey = `${att.storageKey}.teaser.webp`;
          await s.put(teaserKey, p.teaser, "image/webp");
        }
      } catch {
        return reject("We couldn't read this image. It may be corrupted.");
      }
    }
  }
  // Malware scanning hook: no scanner is configured in this deployment (see SECURITY_CHECKLIST.md).
  scanStatus = process.env.MALWARE_SCANNER ? "NOT_SCANNED" : "UNSUPPORTED";
  const updated = await prisma.attachment.update({ where: { id: att.id }, data: { status: "READY", sizeBytes: head.size, previewKey, teaserKey, sha256: digest, scanStatus } });
  return { ok: true, att: updated };
}

export type FileVariant = "original" | "preview" | "teaser";

/**
 * Demo databases share one stored artwork object per patch type: those attachments use the
 * unique storageKey "demo-shared/<type>/<file>~<uuid>", and the object key is the part before
 * "~". Every other key is returned unchanged.
 */
export function objectKey(key: string | null | undefined): string | null {
  if (!key) return null;
  return key.startsWith("demo-shared/") && key.includes("~") ? key.slice(0, key.indexOf("~")) : key;
}

/**
 * Server-side authorization for every file download. Returns the storage key to sign, or null.
 * Original buyer artwork is never public: it requires buyer ownership, an ACTIVE unlock, or staff.
 */
export async function authorizeFile(att: Attachment, variant: FileVariant, user: CurrentUser | null): Promise<string | null> {
  if (att.status !== "READY" || att.deletedAt) return null;
  const key = objectKey(variant === "preview" ? att.previewKey : variant === "teaser" ? att.teaserKey : att.storageKey);
  if (!key) return null;
  const staff = (p: Parameters<typeof can>[1]) => !!user && can(user.platformRole, p);
  const inOrg = (orgId: string | null | undefined) => !!user && !!orgId && user.memberships.some((m) => m.orgId === orgId);
  const guest = await guestOwnerHash();

  switch (att.purpose) {
    case "RFQ_ARTWORK": {
      const link = await prisma.rfqArtwork.findUnique({ where: { attachmentId: att.id }, include: { rfq: true } });
      if (!link) return (guest && att.guestOwnerHash === guest) || (user && att.uploaderUserId === user.id) ? key : null;
      if (staff("rfq:review")) return key;
      if (inOrg(link.rfq.buyerOrgId) || (user && link.rfq.buyerUserId === user.id) || (user && att.uploaderUserId === user.id)) return key;
      const seller = user ? membershipOf(user, "SELLER")?.org.sellerProfile : null;
      if (seller) {
        const access = await sellerAccess(seller.id, link.rfqId);
        if (access.unlocked) return key;
        if (access.canView && variant === "teaser") return key;
      }
      return null;
    }
    case "SELLER_DOCUMENT":
      return inOrg(att.ownerOrgId) || staff("sellers:verify") ? key : null;
    case "PORTFOLIO": {
      if (inOrg(att.ownerOrgId) || staff("sellers:view")) return key;
      const item = await prisma.sellerPortfolioItem.findUnique({ where: { attachmentId: att.id }, include: { seller: true } });
      return item?.isPublic && item.seller.verificationStatus === "VERIFIED" && variant === "preview" ? key : null;
    }
    case "MESSAGE_ATTACHMENT": {
      if (!att.messageId) return user && att.uploaderUserId === user.id ? key : null;
      const msg = await prisma.message.findUnique({ where: { id: att.messageId }, include: { conversation: { include: { rfq: true, seller: true } } } });
      if (!msg || msg.hiddenAt) return staff("messages:moderate") && msg ? key : null;
      const c = msg.conversation;
      if (staff("messages:moderate") || inOrg(c.rfq.buyerOrgId) || (user && c.rfq.buyerUserId === user.id)) return key;
      if (inOrg(c.seller.orgId) && (await sellerAccess(c.sellerId, c.rfqId)).unlocked) return key;
      return null;
    }
    case "QUOTE_ATTACHMENT": {
      if (!att.quoteId) return user && att.uploaderUserId === user.id ? key : null;
      const q = await prisma.quote.findUnique({ where: { id: att.quoteId }, include: { rfq: true, seller: true } });
      if (!q) return null;
      if (staff("quotes:view") || inOrg(q.seller.orgId)) return key;
      if (q.status !== "DRAFT" && (inOrg(q.rfq.buyerOrgId) || (user && q.rfq.buyerUserId === user.id))) return key;
      return null;
    }
    case "DISPUTE_EVIDENCE": {
      if (staff("disputes:decide")) return key;
      return user && att.uploaderUserId === user.id ? key : inOrg(att.ownerOrgId) ? key : null;
    }
  }
  return null;
}

export async function signedFileUrl(att: Attachment, variant: FileVariant, user: CurrentUser | null, expiresIn = 300) {
  const key = await authorizeFile(att, variant, user);
  if (!key) return null;
  const inline = variant !== "original" && true;
  return storage().getDownloadUrl(key, { inline, filename: variant === "original" ? att.sanitizedFilename : undefined, expiresIn });
}

export async function currentUserForFiles() {
  return getCurrentUser().catch(() => null);
}
