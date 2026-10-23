import "server-only";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { notify, orgUserIds, queueEmail } from "@/lib/notifications";
import { contactReleased, redactContactInfo } from "@/lib/rfq/disclosure";
import { trackEvent } from "@/lib/analytics/events";
import type { MessageKind, Prisma } from "@/generated/prisma/client";
import { sellerAccess } from "@/lib/domain/access";
import { DomainError } from "@/lib/domain/rfq";

/**
 * RFQ-linked buyer↔seller messaging. A conversation exists only after an unlock.
 * When the buyer chose platform-messaging-only, contact details typed by EITHER side are masked
 * (the buyer's consent governs disclosure; sellers can't harvest them via chat either).
 */
export async function postMessage(args: { rfqId: string; sellerId: string; side: "BUYER" | "SELLER" | "ADMIN"; userId: string; body: string; attachmentIds?: string[]; kind?: MessageKind; meta?: Record<string, unknown> }) {
  const body = args.body.trim();
  if (!body && !args.attachmentIds?.length) throw new DomainError("EMPTY", "Write a message.");
  if (body.length > 5000) throw new DomainError("TOO_LONG", "Messages are limited to 5,000 characters.");
  const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: args.rfqId } });
  if (args.side === "SELLER") {
    const access = await sellerAccess(args.sellerId, args.rfqId);
    if (!access.unlocked) throw new DomainError("LOCKED", "Unlock this RFQ to message the buyer.");
  }
  const conversation = await prisma.conversation.findUnique({ where: { rfqId_sellerId: { rfqId: args.rfqId, sellerId: args.sellerId } } });
  if (!conversation) throw new DomainError("NOT_FOUND", "Conversation not found.");
  if (conversation.lockedAt) throw new DomainError("LOCKED", "This conversation has been locked by moderation.");
  // Contact details typed in chat are masked unless the buyer's CURRENT choice releases them to this manufacturer.
  const mustMask = args.side !== "ADMIN" && !contactReleased(rfq.disclosureMode, !!conversation.contactSharedAt);
  const masked = mustMask ? redactContactInfo(body) : { text: body, redacted: false };

  const msg = await prisma.$transaction(async (tx) => {
    const m = await tx.message.create({ data: { conversationId: conversation.id, side: args.side, senderUserId: args.userId, body: masked.text, redacted: masked.redacted, kind: args.kind ?? "TEXT", meta: (args.meta ?? undefined) as Prisma.InputJsonValue | undefined } });
    if (args.attachmentIds?.length) {
      const n = await tx.attachment.updateMany({
        where: { id: { in: args.attachmentIds }, uploaderUserId: args.userId, purpose: "MESSAGE_ATTACHMENT", status: "READY", messageId: null },
        data: { messageId: m.id },
      });
      if (n.count !== args.attachmentIds.length) throw new DomainError("ATTACHMENT", "An attachment could not be added.");
    }
    await tx.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), ...(args.side === "BUYER" ? { buyerReadAt: new Date() } : args.side === "SELLER" ? { sellerReadAt: new Date() } : {}) },
    });
    return m;
  });

  if (args.side !== "ADMIN") await trackEvent(args.side === "BUYER" ? "BuyerMessageSent" : "SellerMessageSent", { rfqId: args.rfqId, isDemo: rfq.isDemo });
  const seller = await prisma.sellerProfile.findUniqueOrThrow({ where: { id: args.sellerId } });
  if (args.side !== "SELLER") {
    await notify({
      userIds: await orgUserIds(seller.orgId), type: "new_message", title: `Message about ${rfq.publicRef}`, body: masked.text.slice(0, 140), link: `/seller/messages?c=${conversation.id}`,
      dedupeKey: `msg:${msg.id}`, email: { template: "new_message", data: { from: args.side === "ADMIN" ? "PatchMatch AI" : "The buyer", ref: rfq.publicRef, url: siteUrl(`/seller/messages?c=${conversation.id}`) } },
    });
  }
  if (args.side !== "BUYER") {
    const from = args.side === "ADMIN" ? "PatchMatch AI" : seller.tradingName ?? seller.legalName;
    if (rfq.buyerUserId) {
      await notify({ userIds: [rfq.buyerUserId], type: "new_message", title: `Message from ${from}`, body: masked.text.slice(0, 140), link: `/buyer/messages?c=${conversation.id}`, dedupeKey: `msg:${msg.id}`, email: { template: "new_message", data: { from, ref: rfq.publicRef, url: siteUrl(`/buyer/messages?c=${conversation.id}`) } } });
    } else {
      await queueEmail(rfq.contactEmail, "new_message", { from, ref: rfq.publicRef, url: siteUrl(`/rfq/track/${rfq.publicRef}`) }, `msg:${msg.id}:guest`);
    }
  }
  return { message: msg, redacted: masked.redacted };
}

export async function markConversationRead(conversationId: string, side: "BUYER" | "SELLER") {
  await prisma.conversation.update({ where: { id: conversationId }, data: side === "BUYER" ? { buyerReadAt: new Date() } : { sellerReadAt: new Date() } });
}

export async function unreadCount(where: { buyerOrgId?: string; sellerId?: string }) {
  const convs = await prisma.conversation.findMany({
    where: where.sellerId ? { sellerId: where.sellerId } : { rfq: { buyerOrgId: where.buyerOrgId } },
    select: { id: true, buyerReadAt: true, sellerReadAt: true, lastMessageAt: true },
  });
  let n = 0;
  for (const c of convs) {
    const readAt = where.sellerId ? c.sellerReadAt : c.buyerReadAt;
    if (!c.lastMessageAt || (readAt && readAt >= c.lastMessageAt)) continue;
    n += await prisma.message.count({ where: { conversationId: c.id, createdAt: readAt ? { gt: readAt } : undefined, side: where.sellerId ? { not: "SELLER" } : { not: "BUYER" }, hiddenAt: null } });
  }
  return n;
}
