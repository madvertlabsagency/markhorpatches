"use server";

import { recordRfqEvent } from "@/lib/activity";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertSeller, requireUser } from "@/lib/auth/session";
import { capabilitiesSchema, createSellerApplication, preferencesSchema, saveCapabilities, savePreferences, sellerApplicationSchema, submitForVerification } from "@/lib/domain/sellers";
import { startUnlock } from "@/lib/domain/unlock";
import { quoteInputSchema, saveQuote, withdrawQuote } from "@/lib/domain/quotes";
import { postMessage, markConversationRead } from "@/lib/domain/messages";
import { fileDispute, requestInvoice } from "@/lib/domain/finance";
import { DomainError } from "@/lib/domain/rfq";
import { audit } from "@/lib/audit";
import { randomToken, sha256 } from "@/lib/crypto";
import { siteUrl } from "@/lib/env";
import { queueEmail } from "@/lib/notifications";
import { toMinor } from "@/lib/money";
import { trackEvent } from "@/lib/analytics/events";
import { all, bool, guard, str, toActionError } from "@/lib/actions";
import { runAITask } from "@/lib/services/ai";
import { sellerCopilotTask } from "@/lib/ai/tasks";
import { sellerRfqView } from "@/lib/domain/access";
import { labelFor, BACKINGS } from "@/lib/catalog";
import type { ActionState } from "@/lib/action-state";

export async function applyAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const limited = await guard("seller-apply", 5, 60 * 60_000);
  if (limited) return limited;
  try {
    const user = await requireUser("/become-a-seller/apply");
    const input = sellerApplicationSchema.parse({
      legalName: str(fd, "legalName"), tradingName: str(fd, "tradingName"), country: str(fd, "country"), addressLine1: str(fd, "addressLine1"), city: str(fd, "city"),
      region: str(fd, "region"), postalCode: str(fd, "postalCode"), contactName: str(fd, "contactName"), email: str(fd, "email"), phone: str(fd, "phone"), website: str(fd, "website"),
      registrationNumber: str(fd, "registrationNumber"), yearsOperating: str(fd, "yearsOperating"), factoryLocation: str(fd, "factoryLocation"), exportMarkets: all(fd, "exportMarkets"),
      description: str(fd, "description"), acceptTerms: bool(fd, "acceptTerms") || undefined,
    });
    const org = await createSellerApplication(user.id, input);
    const attr = await import("next/headers").then(async (h) => (await h.cookies()).get("pm_attr")?.value);
    if (attr) {
      try {
        const a = JSON.parse(attr) as Record<string, string>;
        await prisma.marketingAttribution.create({ data: { sellerOrgId: org.id, utmSource: a.utm_source, utmMedium: a.utm_medium, utmCampaign: a.utm_campaign, landingPage: a.landing_page, referrer: a.referrer } });
      } catch {}
    }
  } catch (e) {
    return toActionError(e);
  }
  redirect("/seller/capabilities?onboarding=1");
}

export async function capabilitiesAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, seller } = await assertSeller("org:write");
    const types = all(fd, "types");
    const rows = types.map((t) => ({
      patchType: t, moq: str(fd, `${t}.moq`), maxQuantity: str(fd, `${t}.maxQuantity`), weeklyCapacity: str(fd, `${t}.weeklyCapacity`), standardDays: str(fd, `${t}.standardDays`),
      rushDays: str(fd, `${t}.rushDays`), priceMin: str(fd, `${t}.priceMin`), priceMax: str(fd, `${t}.priceMax`),
    }));
    const input = capabilitiesSchema.parse({ rows, backingOptions: all(fd, "backingOptions"), borderOptions: all(fd, "borderOptions"), shippingCountries: all(fd, "shippingCountries"), artworkSupport: bool(fd, "artworkSupport"), sampleCapable: bool(fd, "sampleCapable"), rushCapable: bool(fd, "rushCapable") });
    await saveCapabilities(seller.id, user.id, input);
    revalidatePath("/seller/capabilities");
    return { ok: true, message: "Capabilities saved. Matching uses them immediately." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function preferencesAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, seller } = await assertSeller("org:write");
    const input = preferencesSchema.parse({ availability: str(fd, "availability"), dailyRfqLimit: str(fd, "dailyRfqLimit"), maxDailySpend: str(fd, "maxDailySpend"), minBudget: str(fd, "minBudget"), emailOpportunities: bool(fd, "emailOpportunities") });
    await savePreferences(seller.id, user.id, input);
    revalidatePath("/seller/settings");
    return { ok: true, message: "Preferences saved." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function attachDocumentAction(attachmentId: string, kind: string, note?: string): Promise<ActionState> {
  try {
    const { user, seller, org } = await assertSeller("org:write");
    const k = z.enum(["BUSINESS_REGISTRATION", "TAX_CERTIFICATE", "FACTORY_PHOTO", "IDENTITY", "OTHER"]).parse(kind);
    const att = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!att || att.ownerOrgId !== org.id || att.purpose !== "SELLER_DOCUMENT" || att.status !== "READY") throw new DomainError("INVALID", "Upload not found.");
    await prisma.sellerDocument.create({ data: { sellerId: seller.id, kind: k, attachmentId, note } });
    await audit(user.id, "seller.document_added", "SellerProfile", seller.id, { kind: k });
    revalidatePath("/seller/verification");
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

export async function removeDocumentAction(documentId: string): Promise<ActionState> {
  try {
    const { seller } = await assertSeller("org:write");
    const doc = await prisma.sellerDocument.findUnique({ where: { id: documentId } });
    if (!doc || doc.sellerId !== seller.id) throw new DomainError("NOT_FOUND", "Document not found.");
    if (seller.verificationStatus === "PENDING_REVIEW") throw new DomainError("LOCKED", "Documents can't be removed while under review.");
    await prisma.$transaction([prisma.sellerDocument.delete({ where: { id: doc.id } }), prisma.attachment.update({ where: { id: doc.attachmentId }, data: { status: "DELETED", deletedAt: new Date() } })]);
    revalidatePath("/seller/verification");
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

export async function addPortfolioAction(attachmentId: string, title: string, patchType?: string): Promise<ActionState> {
  try {
    const { seller, org } = await assertSeller("org:write");
    const att = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!att || att.ownerOrgId !== org.id || att.purpose !== "PORTFOLIO" || att.status !== "READY") throw new DomainError("INVALID", "Upload not found.");
    await prisma.sellerPortfolioItem.create({ data: { sellerId: seller.id, attachmentId, title: title.slice(0, 120) || att.originalFilename, patchType: patchType ? (patchType as never) : null } });
    revalidatePath("/seller/portfolio");
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

export async function portfolioItemAction(itemId: string, action: "TOGGLE" | "DELETE"): Promise<ActionState> {
  try {
    const { seller } = await assertSeller("org:write");
    const item = await prisma.sellerPortfolioItem.findUnique({ where: { id: itemId } });
    if (!item || item.sellerId !== seller.id) throw new DomainError("NOT_FOUND", "Item not found.");
    if (action === "DELETE") await prisma.$transaction([prisma.sellerPortfolioItem.delete({ where: { id: itemId } }), prisma.attachment.update({ where: { id: item.attachmentId }, data: { status: "DELETED", deletedAt: new Date() } })]);
    else await prisma.sellerPortfolioItem.update({ where: { id: itemId }, data: { isPublic: !item.isPublic } });
    revalidatePath("/seller/portfolio");
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

export async function submitVerificationAction(): Promise<ActionState> {
  try {
    const { user, seller } = await assertSeller("org:write");
    await submitForVerification(seller.id, user.id);
    revalidatePath("/seller/verification");
    return { ok: true, message: "Submitted. Our team will review your application." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function unlockAction(rfqId: string, method: "CARD" | "CREDITS"): Promise<ActionState> {
  const limited = await guard("unlock", 20, 10 * 60_000);
  if (limited) return limited;
  let url: string | null = null;
  try {
    const { user, org, seller } = await assertSeller("rfq:purchase");
    const r = await startUnlock({ sellerId: seller.id, orgId: org.id, userId: user.id, userEmail: user.email, rfqId, method });
    if (r.kind === "redirect") url = r.url;
    revalidatePath(`/seller/opportunities/${rfqId}`);
  } catch (e) {
    return toActionError(e);
  }
  if (url) redirect(url);
  return { ok: true, message: "Unlocked. Buyer details are now available." };
}

export async function trackPreviewAction(rfqId: string) {
  const { org, seller } = await assertSeller();
  await trackEvent("RFQPreviewViewed", { rfqId, orgId: org.id });
  // Internal (admin-only) activity: which manufacturers are looking at which requests. One per seller per RFQ per hour.
  const recent = await prisma.activityEvent.count({ where: { kind: "PREVIEW_VIEWED", rfqId, sellerId: seller.id, createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
  if (!recent) await recordRfqEvent("PREVIEW_VIEWED", rfqId, seller.id, { public: false });
}

export async function saveQuoteAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, seller } = await assertSeller("quote:write");
    const input = quoteInputSchema.parse(Object.fromEntries(["quantity", "unitPrice", "setupFee", "sampleFee", "toolingFee", "artworkFee", "shipping", "productionDays", "deliveryEstimate", "moq", "samplePolicy", "paymentTerms", "revisionPolicy", "notes", "validDays"].map((k) => [k, str(fd, k) || undefined])));
    const submit = str(fd, "intent") === "submit";
    const q = await saveQuote({ sellerId: seller.id, userId: user.id, rfqId: str(fd, "rfqId"), input: { ...input, currency: "USD" }, submit, revisionNote: str(fd, "revisionNote") || undefined });
    const attachIds = all(fd, "attachmentIds");
    if (attachIds.length) await prisma.attachment.updateMany({ where: { id: { in: attachIds }, uploaderUserId: user.id, purpose: "QUOTE_ATTACHMENT", status: "READY", quoteId: null }, data: { quoteId: q.id } });
    revalidatePath(`/seller/opportunities/${q.rfqId}`);
    return { ok: true, message: submit ? (q.version > 1 ? `Revision v${q.version} sent to the buyer.` : "Quote sent to the buyer.") : "Draft saved." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function withdrawQuoteAction(quoteId: string): Promise<ActionState> {
  try {
    const { user, seller } = await assertSeller("quote:write");
    await withdrawQuote(seller.id, user.id, quoteId);
    revalidatePath("/seller/quotes");
    return { ok: true, message: "Quote withdrawn." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function copilotAction(rfqId: string, sellerNotes: string): Promise<{ ok: true; draft: { coverMessage: string; checklist: string[]; warnings: string[] }; source: string } | { ok: false; error: string }> {
  try {
    const { user, seller } = await assertSeller("quote:write");
    const v = await sellerRfqView(seller.id, rfqId);
    if (!v?.access.unlocked) return { ok: false, error: "Unlock the RFQ first." };
    const s = v.view.spec;
    const cap = await prisma.sellerCapability.findFirst({ where: { sellerId: seller.id, patchType: v.view.patchType === "NOT_SURE" ? undefined : (v.view.patchType as never) } });
    const qual = await prisma.rfqQualification.findFirst({ where: { rfqId, isCurrent: true } });
    const r = await runAITask(
      sellerCopilotTask,
      {
        sellerName: seller.tradingName ?? seller.legalName, patchType: v.view.patchType, quantity: s.quantity, size: s.width && s.height ? `${s.width}×${s.height} ${s.unit.toLowerCase()}` : "size TBC",
        backing: labelFor(BACKINGS, s.backing), requiredBy: s.requiredBy ? s.requiredBy.toISOString().slice(0, 10) : null, rush: s.rush, sellerStandardDays: cap?.standardDays ?? null, sellerMoq: cap?.moq ?? null,
        missingFields: qual?.missingFields ?? [], sellerNotes: sellerNotes.slice(0, 1000),
      },
      { entityType: "Rfq", entityId: rfqId, actorId: user.id },
    );
    return { ok: true, draft: r.output, source: r.source };
  } catch (e) {
    const r = toActionError(e);
    return { ok: false, error: r && !r.ok ? r.error : "Error" };
  }
}

export async function sellerSendMessageAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const limited = await guard("msg", 40, 10 * 60_000);
  if (limited) return limited;
  try {
    const { user, seller } = await assertSeller();
    const conv = await prisma.conversation.findUnique({ where: { id: str(fd, "conversationId") } });
    if (!conv || conv.sellerId !== seller.id) throw new DomainError("NOT_FOUND", "Conversation not found.");
    const r = await postMessage({ rfqId: conv.rfqId, sellerId: seller.id, side: "SELLER", userId: user.id, body: str(fd, "body"), attachmentIds: all(fd, "attachmentIds") });
    revalidatePath("/seller/messages");
    return { ok: true, message: r.redacted ? "Sent. Contact details were hidden — this buyer chose platform messaging only." : undefined };
  } catch (e) {
    return toActionError(e);
  }
}

export async function sellerMarkReadAction(conversationId: string) {
  const { seller } = await assertSeller();
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (conv?.sellerId === seller.id) await markConversationRead(conversationId, "SELLER");
}

export async function fileClaimAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, seller } = await assertSeller("rfq:purchase");
    const reason = z.enum(["INVALID_CONTACT", "DUPLICATE", "SPAM_OR_FRAUD", "NOT_AS_DESCRIBED", "BUYER_ALREADY_SOURCED", "OTHER"]).parse(str(fd, "reason"));
    await fileDispute({ sellerId: seller.id, userId: user.id, unlockId: str(fd, "unlockId"), reason, description: str(fd, "description"), evidenceIds: all(fd, "evidenceIds") });
    revalidatePath("/seller/quality-claims");
    return { ok: true, message: "Claim submitted. We'll review the evidence and record a decision." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function requestInvoiceAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const limited = await guard("invoice-req", 5, 60 * 60_000);
  if (limited) return limited;
  try {
    const { user, org } = await assertSeller("org:billing");
    await requestInvoice({ orgId: org.id, userId: user.id, amountMinor: toMinor(str(fd, "amount") || "0") });
    return { ok: true, message: "Request sent. Finance will issue an invoice with bank transfer details." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function inviteMemberAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const limited = await guard("invite", 10, 60 * 60_000);
  if (limited) return limited;
  try {
    const { user, org } = await assertSeller("org:team");
    const d = z.object({ email: z.string().trim().toLowerCase().email(), role: z.enum(["ADMIN", "MEMBER"]) }).parse({ email: str(fd, "email"), role: str(fd, "role") });
    if (await prisma.organizationMember.findFirst({ where: { orgId: org.id, user: { email: d.email } } })) throw new DomainError("EXISTS", "That person is already on your team.");
    const token = randomToken();
    const inv = await prisma.invitation.create({ data: { orgId: org.id, email: d.email, role: d.role, tokenHash: sha256(token), invitedById: user.id, expiresAt: new Date(Date.now() + 7 * 86_400_000) } });
    await queueEmail(d.email, "org_invite", { org: org.name, inviter: user.name ?? user.email, url: siteUrl(`/invite?token=${token}`) }, `invite:${inv.id}`);
    await audit(user.id, "org.invite", "Organization", org.id, { email: d.email, role: d.role });
    revalidatePath("/seller/team");
    return { ok: true, message: `Invitation sent to ${d.email}.` };
  } catch (e) {
    return toActionError(e);
  }
}

export async function memberAction(memberId: string, action: "REMOVE" | "MAKE_ADMIN" | "MAKE_MEMBER"): Promise<ActionState> {
  try {
    const { user, org } = await assertSeller("org:team");
    const m = await prisma.organizationMember.findUnique({ where: { id: memberId } });
    if (!m || m.orgId !== org.id) throw new DomainError("NOT_FOUND", "Member not found.");
    if (m.role === "OWNER") throw new DomainError("INVALID", "The owner can't be changed here.");
    if (m.userId === user.id) throw new DomainError("INVALID", "You can't change your own role.");
    if (action === "REMOVE") await prisma.organizationMember.delete({ where: { id: m.id } });
    else await prisma.organizationMember.update({ where: { id: m.id }, data: { role: action === "MAKE_ADMIN" ? "ADMIN" : "MEMBER" } });
    await audit(user.id, `org.member_${action.toLowerCase()}`, "Organization", org.id, { memberId });
    revalidatePath("/seller/team");
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

export async function revokeInviteAction(inviteId: string): Promise<ActionState> {
  try {
    const { org } = await assertSeller("org:team");
    await prisma.invitation.updateMany({ where: { id: inviteId, orgId: org.id, acceptedAt: null }, data: { revokedAt: new Date() } });
    revalidatePath("/seller/team");
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

export async function sellerProfileAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, seller } = await assertSeller("org:write");
    const d = z.object({ tradingName: z.string().trim().max(160).optional(), description: z.string().trim().max(1500).optional(), website: z.string().trim().max(200).optional(), phone: z.string().trim().min(7).max(32) }).parse({ tradingName: str(fd, "tradingName") || undefined, description: str(fd, "description") || undefined, website: str(fd, "website") || undefined, phone: str(fd, "phone") });
    await prisma.sellerProfile.update({ where: { id: seller.id }, data: d });
    await audit(user.id, "seller.profile", "SellerProfile", seller.id);
    revalidatePath("/seller/settings");
    return { ok: true, message: "Profile saved." };
  } catch (e) {
    return toActionError(e);
  }
}

