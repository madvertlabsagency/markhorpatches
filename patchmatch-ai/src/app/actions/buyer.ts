"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertBuyer, getCurrentUser } from "@/lib/auth/session";
import { buyerCancelRfq, buyerUpdateRfq, DomainError } from "@/lib/domain/rfq";
import { buyerQuoteAction } from "@/lib/domain/quotes";
import { postMessage, markConversationRead } from "@/lib/domain/messages";
import { guard, str, toActionError } from "@/lib/actions";
import { audit } from "@/lib/audit";
import type { ActionState } from "@/lib/action-state";

/** Ownership check for every buyer RFQ action: org membership or the RFQ's own user. */
async function ownRfq(rfqId: string) {
  const user = await getCurrentUser();
  if (!user) throw new DomainError("AUTH", "Please sign in.");
  const rfq = await prisma.rfq.findUnique({ where: { id: rfqId } });
  const owns = rfq && (rfq.buyerUserId === user.id || user.memberships.some((m) => m.orgId === rfq.buyerOrgId));
  if (!rfq || !owns) throw new DomainError("NOT_FOUND", "Request not found.");
  return { user, rfq };
}

export async function quoteAction(rfqId: string, quoteId: string, action: "VIEW" | "SHORTLIST" | "UNSHORTLIST" | "REJECT" | "SELECT" | "CLARIFY", message?: string): Promise<ActionState> {
  try {
    const { user } = await ownRfq(rfqId);
    await buyerQuoteAction({ rfqId, quoteId, userId: user.id, action, message });
    revalidatePath(`/buyer/rfqs/${rfqId}`);
    return { ok: true, message: action === "SELECT" ? "Manufacturer selected — they've been notified." : "Updated." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateRfqAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, rfq } = await ownRfq(str(fd, "rfqId"));
    const num = (k: string) => (str(fd, k) ? Number(str(fd, k)) : undefined);
    const patch = z
      .object({
        notes: z.string().max(2000).optional(),
        width: z.number().positive().max(60).optional(),
        height: z.number().positive().max(60).optional(),
        quantity: z.number().int().min(1).max(1_000_000).optional(),
        colorCount: z.number().int().min(1).max(30).optional(),
        backing: z.enum(["SEW_ON", "IRON_ON", "HOOK_AND_LOOP", "ADHESIVE", "NONE", "OTHER"]).optional(),
        requiredBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        destinationPostal: z.string().max(16).optional(),
      })
      .parse({
        notes: str(fd, "notes") || undefined, width: num("width"), height: num("height"), quantity: num("quantity"), colorCount: num("colorCount"),
        backing: str(fd, "backing") || undefined, requiredBy: str(fd, "requiredBy") || undefined, destinationPostal: str(fd, "destinationPostal") || undefined,
      });
    await buyerUpdateRfq(rfq.id, user.id, patch);
    revalidatePath(`/buyer/rfqs/${rfq.id}`);
    return { ok: true, message: "Thanks — your request was updated and sent back for review." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function cancelRfqAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, rfq } = await ownRfq(str(fd, "rfqId"));
    await buyerCancelRfq(rfq.id, user.id, str(fd, "reason").slice(0, 300));
    revalidatePath(`/buyer/rfqs/${rfq.id}`);
    return { ok: true, message: "Request closed." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function reportProblemAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const limited = await guard("report", 10, 60 * 60_000);
  if (limited) return limited;
  try {
    const { user, rfq } = await ownRfq(str(fd, "rfqId"));
    const reason = z.string().min(3).max(80).parse(str(fd, "reason"));
    const details = z.string().min(10, "Please add a few details").max(2000).parse(str(fd, "details"));
    const r = await prisma.report.create({ data: { reporterId: user.id, entityType: "Rfq", entityId: rfq.id, reason, details } });
    await audit(user.id, "report.create", "Report", r.id, { rfqId: rfq.id, reason });
    const { alertAdmins } = await import("@/lib/notifications");
    await alertAdmins("Buyer reported a problem", `${rfq.publicRef}: ${reason}`, "/admin/messages?tab=reports", `report:${r.id}`, ["SUPER_ADMIN", "ADMIN", "SUPPORT"]);
    return { ok: true, message: "Thanks — our team will look into it." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function buyerSendMessageAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const limited = await guard("msg", 40, 10 * 60_000);
  if (limited) return limited;
  try {
    const conv = await prisma.conversation.findUnique({ where: { id: str(fd, "conversationId") } });
    if (!conv) throw new DomainError("NOT_FOUND", "Conversation not found.");
    const { user } = await ownRfq(conv.rfqId);
    const r = await postMessage({ rfqId: conv.rfqId, sellerId: conv.sellerId, side: "BUYER", userId: user.id, body: str(fd, "body"), attachmentIds: fd.getAll("attachmentIds").map(String).filter(Boolean) });
    revalidatePath("/buyer/messages");
    return { ok: true, message: r.redacted ? "Sent. Contact details were hidden because you chose platform messaging only." : undefined };
  } catch (e) {
    return toActionError(e);
  }
}

export async function buyerMarkReadAction(conversationId: string) {
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv) return;
  await ownRfq(conv.rfqId);
  await markConversationRead(conversationId, "BUYER");
}

export async function markNotificationsReadAction(): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };
  await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function buyerSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, org } = await assertBuyer();
    const d = z.object({ name: z.string().trim().min(2).max(120), companyName: z.string().trim().max(160).optional(), phone: z.string().trim().max(32).optional() }).parse({ name: str(fd, "name"), companyName: str(fd, "companyName") || undefined, phone: str(fd, "phone") || undefined });
    await prisma.user.update({ where: { id: user.id }, data: { name: d.name, phone: d.phone } });
    await prisma.buyerProfile.upsert({ where: { orgId: org.id }, create: { orgId: org.id, companyName: d.companyName, phone: d.phone }, update: { companyName: d.companyName, phone: d.phone } });
    if (d.companyName) await prisma.organization.update({ where: { id: org.id }, data: { name: d.companyName } });
    revalidatePath("/buyer/settings");
    return { ok: true, message: "Saved." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function marketingConsentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };
  const granted = fd.get("marketing") === "on";
  const { sha256 } = await import("@/lib/crypto");
  const { CONSENT_TEXT, CONSENT_VERSION } = await import("@/lib/rfq/schema");
  await prisma.consentRecord.create({ data: { kind: "MARKETING", granted, email: user.email, userId: user.id, textVersion: CONSENT_VERSION, textHash: sha256(CONSENT_TEXT.MARKETING) } });
  return { ok: true, message: granted ? "Subscribed to occasional updates." : "Unsubscribed from marketing emails." };
}
