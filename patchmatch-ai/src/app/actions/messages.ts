"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, membershipOf } from "@/lib/auth/session";
import { alertAdmins } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { DomainError } from "@/lib/domain/rfq";
import { guard, toActionError } from "@/lib/actions";
import type { ActionState } from "@/lib/action-state";

/** Either participant can report a conversation; the team reviews it under Admin → Conversations & reports. */
export async function reportConversationAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const limited = await guard("report", 5, 10 * 60_000);
  if (limited) return limited;
  try {
    const user = await getCurrentUser();
    if (!user) throw new DomainError("AUTH", "Please sign in.");
    const d = z.object({ conversationId: z.string().uuid(), reason: z.enum(["SPAM", "ABUSE", "OFF_PLATFORM_PRESSURE", "SCAM", "OTHER"]), details: z.string().max(1000).optional() }).parse(Object.fromEntries(fd));
    const conv = await prisma.conversation.findUnique({ where: { id: d.conversationId }, include: { rfq: true } });
    const isBuyer = !!conv && (conv.rfq.buyerUserId === user.id || user.memberships.some((m) => m.orgId === conv.rfq.buyerOrgId));
    const isSeller = !!conv && membershipOf(user, "SELLER")?.org.sellerProfile?.id === conv.sellerId;
    if (!conv || (!isBuyer && !isSeller)) throw new DomainError("NOT_FOUND", "Conversation not found.");
    await prisma.$transaction(async (tx) => {
      await tx.report.create({ data: { reporterId: user.id, entityType: "Conversation", entityId: conv.id, reason: d.reason, details: d.details } });
      await tx.conversation.update({ where: { id: conv.id }, data: { reportedAt: new Date() } });
      await audit(user.id, "conversation.report", "Conversation", conv.id, { reason: d.reason }, tx);
    });
    await alertAdmins("Conversation reported", `${conv.rfq.publicRef}: ${d.reason.toLowerCase().replace(/_/g, " ")}`, "/admin/messages", `report:${conv.id}:${Date.now()}`, ["SUPER_ADMIN", "ADMIN", "SUPPORT"]);
    revalidatePath(isBuyer ? "/buyer/messages" : "/seller/messages");
    return { ok: true, message: "Thanks — our team will review this conversation." };
  } catch (e) {
    return toActionError(e);
  }
}
