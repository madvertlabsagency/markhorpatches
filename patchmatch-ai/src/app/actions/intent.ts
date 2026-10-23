"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { verifyPayload } from "@/lib/crypto";
import { clientIp } from "@/lib/request";
import { confirmIntent, setReminderOptOut, shareContactWithSeller, updatePrivacyPreference } from "@/lib/domain/engagement";
import { toActionError } from "@/lib/actions";
import { DomainError } from "@/lib/domain/rfq";
import type { ActionState } from "@/lib/action-state";

/** Resolves the RFQ the caller may act on as its buyer: signed email/verify-page token, or signed-in owner. */
async function buyerRfq(fd: FormData) {
  const token = String(fd.get("token") ?? "");
  if (token) {
    const p = verifyPayload<{ rfqId: string; p: string }>(token);
    if (!p || p.p !== "buyer") throw new DomainError("EXPIRED", "This link has expired. Open your request from your dashboard.");
    return { rfq: await prisma.rfq.findUniqueOrThrow({ where: { id: p.rfqId } }), userId: null as string | null };
  }
  const user = await getCurrentUser();
  const rfqId = z.string().uuid().parse(fd.get("rfqId"));
  const rfq = await prisma.rfq.findUnique({ where: { id: rfqId } });
  const owns = !!user && !!rfq && (rfq.buyerUserId === user.id || user.memberships.some((m) => m.orgId === rfq.buyerOrgId));
  if (!owns) throw new DomainError("NOT_FOUND", "Request not found.");
  return { rfq: rfq!, userId: user!.id };
}

export async function confirmIntentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { rfq, userId } = await buyerRfq(fd);
    const choice = z.enum(["READY", "LATER", "FOUND_SUPPLIER"]).parse(fd.get("choice"));
    await confirmIntent(rfq.id, choice, { userId, via: fd.get("token") ? "email_link" : "dashboard" });
    revalidatePath(`/buyer/rfqs/${rfq.id}`);
    return { ok: true, message: choice === "READY" ? "Thanks — we'll keep matching you with manufacturers." : choice === "LATER" ? "Noted. Manufacturers will see you're comparing options." : "Glad you found a supplier. We've closed this request." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function updatePrivacyAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { rfq, userId } = await buyerRfq(fd);
    const mode = z.enum(["PLATFORM_MESSAGING_ONLY", "BUYER_SELECTED", "FULL_CONTACT"]).parse(fd.get("disclosureMode"));
    await updatePrivacyPreference(rfq.id, mode, fd.get("consentDirectContact") === "on", { userId, email: rfq.contactEmail, ip: await clientIp() });
    revalidatePath(`/buyer/rfqs/${rfq.id}`);
    return { ok: true, message: "Privacy preference saved." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function remindersAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { rfq, userId } = await buyerRfq(fd);
    const off = fd.get("optOut") === "1";
    await setReminderOptOut(rfq.id, off, userId);
    revalidatePath(`/buyer/rfqs/${rfq.id}`);
    return { ok: true, message: off ? "Reminder emails turned off for this request." : "Reminder emails turned on." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function shareContactAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { rfq, userId } = await buyerRfq(fd);
    if (!userId) throw new DomainError("AUTH", "Sign in to share your details.");
    const sellerId = z.string().uuid().parse(fd.get("sellerId"));
    await shareContactWithSeller(rfq.id, sellerId, { userId, email: rfq.contactEmail });
    revalidatePath("/buyer/messages");
    revalidatePath(`/buyer/rfqs/${rfq.id}`);
    return { ok: true, message: "Contact details shared with this manufacturer." };
  } catch (e) {
    return toActionError(e);
  }
}
