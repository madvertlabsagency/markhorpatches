"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertAdmin, revokeAllSessions } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { all, bool, str, toActionError } from "@/lib/actions";
import { toMinor } from "@/lib/money";
import { adminQualifyRfq, adminRejectRfq, adminRequestClarification, processRfq, DomainError } from "@/lib/domain/rfq";
import { adminOverrideMatch, publishOpportunity, runMatching, setOpportunityStatus } from "@/lib/domain/matching";
import { transitionVerification } from "@/lib/domain/sellers";
import { adjustCredits, decideDispute, issueInvoice, markInvoicePaid, voidInvoice } from "@/lib/domain/finance";
import { reconcilePayment } from "@/lib/domain/unlock";
import { postMessage } from "@/lib/domain/messages";
import { normalizeWeights, type FactorKey } from "@/lib/matching/engine";
import { PERMISSIONS } from "@/lib/auth/rbac";
import type { ActionState } from "@/lib/action-state";

const ok = (message?: string, path?: string): ActionState => {
  if (path) revalidatePath(path);
  return { ok: true, message };
};

// ───────── RFQ review & qualification ─────────

export async function qualifyRfqAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin("rfq:review");
    const tier = z.enum(["A", "B"]).parse(str(fd, "tier"));
    const pricingTier = z.enum(["STANDARD", "HIGH_INTENT", "PREMIUM", "ENTERPRISE"]).parse(str(fd, "pricingTier"));
    await adminQualifyRfq(admin.id, str(fd, "rfqId"), { tier, pricingTier, note: str(fd, "note") || undefined });
    return ok("Qualified. Matching has been queued.", `/admin/rfq-review/${str(fd, "rfqId")}`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function clarifyRfqAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin("rfq:review");
    await adminRequestClarification(admin.id, str(fd, "rfqId"), str(fd, "questions").split("\n"));
    return ok("Clarification request emailed to the buyer.", `/admin/rfq-review/${str(fd, "rfqId")}`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function rejectRfqAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin("rfq:review");
    const reason = z.string().min(5, "Give a reason").max(500).parse(str(fd, "reason"));
    await adminRejectRfq(admin.id, str(fd, "rfqId"), reason);
    return ok("RFQ rejected (Tier D) and closed.", `/admin/rfq-review/${str(fd, "rfqId")}`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function rerunQualificationAction(rfqId: string): Promise<ActionState> {
  try {
    const admin = await assertAdmin("rfq:review");
    const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: rfqId } });
    if (rfq.status !== "UNDER_REVIEW" && rfq.status !== "CLARIFICATION_REQUIRED") throw new DomainError("STATE", "Only RFQs under review can be re-qualified.");
    await processRfq(rfqId);
    await audit(admin.id, "rfq.requalify", "Rfq", rfqId);
    return ok("Qualification re-run.", `/admin/rfq-review/${rfqId}`);
  } catch (e) {
    return toActionError(e);
  }
}

// ───────── Matching & opportunities ─────────

export async function rematchAction(rfqId: string): Promise<ActionState> {
  try {
    const admin = await assertAdmin("matching:manage");
    const r = await runMatching(rfqId, admin.id);
    return ok(`${r.eligible} eligible of ${r.evaluated} verified manufacturers.`, `/admin/matching/${rfqId}`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function overrideMatchAction(matchId: string, action: "APPROVE" | "REJECT", note: string): Promise<ActionState> {
  try {
    const admin = await assertAdmin("matching:manage");
    if (!note.trim()) throw new DomainError("INVALID", "Add a note for the audit log.");
    await adminOverrideMatch(admin.id, matchId, action, note.trim());
    const m = await prisma.rfqMatch.findUniqueOrThrow({ where: { id: matchId } });
    return ok("Override recorded.", `/admin/matching/${m.rfqId}`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function publishAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin("opportunity:manage");
    const mode = z.enum(["EXCLUSIVE", "LIMITED_SHARED", "PRIVATE_INVITATION", "ADMIN_ASSIGNMENT"]).parse(str(fd, "mode"));
    const price = str(fd, "price");
    if (price) await assertAdmin("pricing:manage");
    await publishOpportunity(str(fd, "rfqId"), admin.id, {
      distributionMode: mode, maxUnlocks: str(fd, "maxUnlocks") ? Number(str(fd, "maxUnlocks")) : undefined, priceOverrideMinor: price ? toMinor(price) : undefined, assignedSellerIds: all(fd, "sellerIds"),
    });
    return ok("Opportunity published and manufacturers notified.", `/admin/matching/${str(fd, "rfqId")}`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function opportunityStatusAction(rfqId: string, to: "PAUSED" | "AVAILABLE" | "WITHDRAWN"): Promise<ActionState> {
  try {
    const admin = await assertAdmin("opportunity:manage");
    await setOpportunityStatus(admin.id, rfqId, to);
    return ok("Updated.", "/admin/opportunities");
  } catch (e) {
    return toActionError(e);
  }
}

export async function matchingConfigAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin("matching:manage");
    const keys: FactorKey[] = ["capability", "capacity", "delivery", "quality", "budget", "responsiveness", "logistics"];
    const weights = normalizeWeights(Object.fromEntries(keys.map((k) => [k, Number(str(fd, k))])));
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    if (total !== 100) throw new DomainError("INVALID", `Weights must add up to 100 (currently ${total}).`);
    const minScore = z.coerce.number().int().min(0).max(100).parse(str(fd, "minScore"));
    const maxNotified = z.coerce.number().int().min(1).max(20).parse(str(fd, "maxNotified"));
    const version = `cfg-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`;
    await prisma.$transaction(async (tx) => {
      await tx.matchingConfiguration.updateMany({ where: { active: true }, data: { active: false } });
      await tx.matchingConfiguration.create({ data: { version, weights, minScore, maxNotified, active: true, createdById: admin.id } });
      await audit(admin.id, "matching.config", "MatchingConfiguration", version, { weights, minScore, maxNotified }, tx);
    });
    return ok(`Activated ${version}. Applies to the next matching run.`, "/admin/matching");
  } catch (e) {
    return toActionError(e);
  }
}

// ───────── Sellers ─────────

export async function verificationDecisionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin("sellers:verify");
    const to = z.enum(["VERIFIED", "INFO_REQUIRED", "REJECTED", "SUSPENDED", "PENDING_REVIEW"]).parse(str(fd, "decision"));
    await transitionVerification(str(fd, "sellerId"), to, { actorId: admin.id, reason: str(fd, "reason") || undefined, requestedInfo: to === "INFO_REQUIRED" ? str(fd, "reason") : undefined, isAdmin: true });
    return ok("Decision recorded and the seller notified.", `/admin/seller-verification/${str(fd, "sellerId")}`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function adjustCreditsAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin("payments:manage");
    await adjustCredits({ adminId: admin.id, orgId: str(fd, "orgId"), amountMinor: toMinor(str(fd, "amount") || "0"), memo: str(fd, "memo") });
    return ok("Credits added.", `/admin/sellers/${str(fd, "sellerId")}`);
  } catch (e) {
    return toActionError(e);
  }
}

// ───────── Finance ─────────

export async function issueInvoiceAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin("payments:manage");
    const inv = await issueInvoice({ adminId: admin.id, orgId: str(fd, "orgId"), amountMinor: toMinor(str(fd, "amount") || "0"), description: str(fd, "description") || "Prepaid RFQ credits", dueDays: Number(str(fd, "dueDays") || 14) });
    return ok(`Invoice ${inv.number} issued.`, "/admin/payments");
  } catch (e) {
    return toActionError(e);
  }
}

export async function markInvoicePaidAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin("payments:manage");
    await markInvoicePaid({ adminId: admin.id, invoiceId: str(fd, "invoiceId"), reference: str(fd, "reference") });
    return ok("Marked paid — credits added to the seller's wallet.", "/admin/payments");
  } catch (e) {
    return toActionError(e);
  }
}

export async function voidInvoiceAction(invoiceId: string): Promise<ActionState> {
  try {
    const admin = await assertAdmin("payments:manage");
    await voidInvoice(admin.id, invoiceId);
    return ok("Invoice voided.", "/admin/payments");
  } catch (e) {
    return toActionError(e);
  }
}

export async function reconcileAction(paymentId: string): Promise<ActionState> {
  try {
    const admin = await assertAdmin("payments:view");
    const p = await reconcilePayment(paymentId);
    await audit(admin.id, "payment.reconcile", "Payment", paymentId, { status: p?.status });
    return ok(`Status: ${p?.status ?? "unknown"}`, "/admin/payments");
  } catch (e) {
    return toActionError(e);
  }
}

export async function disputeDecisionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin("disputes:decide");
    const decision = z.enum(["CREDIT", "REFUND", "REJECT"]).parse(str(fd, "decision"));
    if (decision === "REFUND") await assertAdmin("refunds:decide");
    await decideDispute({ adminId: admin.id, disputeId: str(fd, "disputeId"), decision, note: str(fd, "note") });
    return ok("Decision recorded; ledger updated.", `/admin/disputes/${str(fd, "disputeId")}`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function disputeReviewAction(disputeId: string): Promise<ActionState> {
  try {
    const admin = await assertAdmin("disputes:decide");
    await prisma.dispute.updateMany({ where: { id: disputeId, status: "OPEN" }, data: { status: "UNDER_REVIEW" } });
    await audit(admin.id, "dispute.review", "Dispute", disputeId);
    return ok("Marked under review.", `/admin/disputes/${disputeId}`);
  } catch (e) {
    return toActionError(e);
  }
}

// ───────── Pricing ─────────

export async function createPricingRuleAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin("pricing:manage");
    const d = z
      .object({
        name: z.string().min(3).max(80),
        tier: z.enum(["STANDARD", "HIGH_INTENT", "PREMIUM", "ENTERPRISE"]),
        patchType: z.string().optional(),
        distributionMode: z.string().optional(),
        price: z.coerce.number().min(1).max(1000),
        min: z.coerce.number().min(1).max(1000),
        max: z.coerce.number().min(1).max(1000),
        discountPct: z.coerce.number().min(0).max(90),
        priority: z.coerce.number().int().min(0).max(100),
        startsAt: z.string().optional(),
        endsAt: z.string().optional(),
      })
      .parse({ name: str(fd, "name"), tier: str(fd, "tier"), patchType: str(fd, "patchType") || undefined, distributionMode: str(fd, "distributionMode") || undefined, price: str(fd, "price"), min: str(fd, "min") || "5", max: str(fd, "max") || "500", discountPct: str(fd, "discountPct") || "0", priority: str(fd, "priority") || "0", startsAt: str(fd, "startsAt") || undefined, endsAt: str(fd, "endsAt") || undefined });
    if (d.min > d.max) throw new DomainError("INVALID", "Minimum exceeds maximum.");
    const rule = await prisma.pricingRule.create({
      data: {
        name: d.name, tier: d.tier, patchType: (d.patchType as never) ?? null, distributionMode: (d.distributionMode as never) ?? null, priceMinor: toMinor(d.price), minMinor: toMinor(d.min), maxMinor: toMinor(d.max),
        discountBps: Math.round(d.discountPct * 100), priority: d.priority, startsAt: d.startsAt ? new Date(d.startsAt) : null, endsAt: d.endsAt ? new Date(d.endsAt) : null, createdById: admin.id,
      },
    });
    await audit(admin.id, "pricing.rule_create", "PricingRule", rule.id, d);
    return ok("Rule created. Applies to opportunities published from now on (published prices never change).", "/admin/pricing");
  } catch (e) {
    return toActionError(e);
  }
}

export async function togglePricingRuleAction(ruleId: string): Promise<ActionState> {
  try {
    const admin = await assertAdmin("pricing:manage");
    const r = await prisma.pricingRule.findUniqueOrThrow({ where: { id: ruleId } });
    await prisma.pricingRule.update({ where: { id: ruleId }, data: { active: !r.active } });
    await audit(admin.id, r.active ? "pricing.rule_deactivate" : "pricing.rule_activate", "PricingRule", ruleId);
    return ok(undefined, "/admin/pricing");
  } catch (e) {
    return toActionError(e);
  }
}

// ───────── Messages & moderation ─────────

export async function hideMessageAction(messageId: string): Promise<ActionState> {
  try {
    const admin = await assertAdmin("messages:moderate");
    await prisma.message.update({ where: { id: messageId }, data: { hiddenAt: new Date(), flagged: true } });
    await audit(admin.id, "message.hide", "Message", messageId);
    return ok("Message hidden.", "/admin/messages");
  } catch (e) {
    return toActionError(e);
  }
}

export async function lockConversationAction(conversationId: string, lock: boolean): Promise<ActionState> {
  try {
    const admin = await assertAdmin("messages:moderate");
    await prisma.conversation.update({ where: { id: conversationId }, data: { lockedAt: lock ? new Date() : null } });
    await audit(admin.id, lock ? "conversation.lock" : "conversation.unlock", "Conversation", conversationId);
    return ok(undefined, "/admin/messages");
  } catch (e) {
    return toActionError(e);
  }
}

export async function adminMessageAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin("messages:moderate");
    const c = await prisma.conversation.findUniqueOrThrow({ where: { id: str(fd, "conversationId") } });
    await postMessage({ rfqId: c.rfqId, sellerId: c.sellerId, side: "ADMIN", userId: admin.id, body: str(fd, "body") });
    await audit(admin.id, "message.admin_post", "Conversation", c.id);
    return ok("Posted to the conversation.", "/admin/messages");
  } catch (e) {
    return toActionError(e);
  }
}

export async function resolveReportAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin("messages:moderate");
    const status = z.enum(["ACTIONED", "DISMISSED"]).parse(str(fd, "status"));
    await prisma.report.update({ where: { id: str(fd, "reportId") }, data: { status, resolution: str(fd, "resolution"), resolvedById: admin.id } });
    await audit(admin.id, `report.${status.toLowerCase()}`, "Report", str(fd, "reportId"));
    return ok("Report resolved.", "/admin/messages");
  } catch (e) {
    return toActionError(e);
  }
}

// ───────── Marketing ─────────

export async function adSpendAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin("marketing:manage");
    const d = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), channel: z.string().min(2).max(40), campaign: z.string().max(120).optional(), amount: z.coerce.number().min(0).max(1_000_000), leads: z.coerce.number().int().min(0).optional() }).parse({ date: str(fd, "date"), channel: str(fd, "channel"), campaign: str(fd, "campaign") || undefined, amount: str(fd, "amount"), leads: str(fd, "leads") || undefined });
    await prisma.adSpendEntry.create({ data: { date: new Date(`${d.date}T00:00:00Z`), channel: d.channel, campaign: d.campaign, amountMinor: toMinor(d.amount), leads: d.leads, createdById: admin.id } });
    await audit(admin.id, "marketing.ad_spend", "AdSpendEntry", null, d);
    return ok("Ad spend recorded.", "/admin/marketing");
  } catch (e) {
    return toActionError(e);
  }
}

// ───────── Notifications, jobs, templates ─────────

export async function saveTemplateAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin("notifications:manage");
    const key = str(fd, "key");
    const data = { subject: z.string().min(3).max(200).parse(str(fd, "subject")), body: z.string().min(10).max(5000).parse(str(fd, "body")), active: bool(fd, "active") };
    await prisma.notificationTemplate.upsert({ where: { key_channel: { key, channel: "EMAIL" } }, create: { key, channel: "EMAIL", ...data }, update: data });
    await audit(admin.id, "template.save", "NotificationTemplate", key, { active: data.active });
    return ok("Template saved.", "/admin/notifications");
  } catch (e) {
    return toActionError(e);
  }
}

export async function retryJobAction(jobId: string): Promise<ActionState> {
  try {
    const admin = await assertAdmin("notifications:manage");
    await prisma.backgroundJob.update({ where: { id: jobId }, data: { status: "QUEUED", runAt: new Date(), attempts: 0, lastError: null } });
    await audit(admin.id, "job.retry", "BackgroundJob", jobId);
    return ok("Re-queued.", "/admin/notifications");
  } catch (e) {
    return toActionError(e);
  }
}

export async function runJobsNowAction(): Promise<ActionState> {
  try {
    await assertAdmin("notifications:manage");
    const { runJobs } = await import("@/lib/jobs/queue");
    const { JOB_HANDLERS } = await import("@/lib/jobs/handlers");
    const r = await runJobs(JOB_HANDLERS, 50);
    return ok(`Processed ${r.length} job(s), ${r.filter((x) => !x.ok).length} failed.`, "/admin/notifications");
  } catch (e) {
    return toActionError(e);
  }
}

// ───────── Roles, users, settings ─────────

export async function setRoleAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin("roles:manage");
    const role = z.enum(["NONE", "SUPPORT", "REVIEWER", "FINANCE", "ADMIN", "SUPER_ADMIN"]).parse(str(fd, "role"));
    const email = z.string().trim().toLowerCase().email().parse(str(fd, "email"));
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new DomainError("NOT_FOUND", "No user with that email. They must create an account first.");
    if (user.id === admin.id && role !== "SUPER_ADMIN") throw new DomainError("INVALID", "You can't remove your own super admin role.");
    await prisma.user.update({ where: { id: user.id }, data: { platformRole: role } });
    await revokeAllSessions(user.id); // role change forces re-authentication (and MFA for staff)
    await audit(admin.id, "user.role_change", "User", user.id, { from: user.platformRole, to: role });
    return ok(`${email} is now ${role}. Their sessions were signed out.`, "/admin/roles");
  } catch (e) {
    return toActionError(e);
  }
}

export async function grantPermissionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin("roles:manage");
    const permission = z.enum(PERMISSIONS).parse(str(fd, "permission"));
    const user = await prisma.user.findUniqueOrThrow({ where: { email: str(fd, "email").toLowerCase() } });
    if (user.platformRole === "NONE") throw new DomainError("INVALID", "Grant a staff role first.");
    await prisma.roleGrant.upsert({ where: { userId_permission: { userId: user.id, permission } }, create: { userId: user.id, permission, grantedById: admin.id }, update: {} });
    await audit(admin.id, "user.permission_grant", "User", user.id, { permission });
    return ok("Permission granted.", "/admin/roles");
  } catch (e) {
    return toActionError(e);
  }
}

export async function disableUserAction(userId: string, disable: boolean): Promise<ActionState> {
  try {
    const admin = await assertAdmin("roles:manage");
    if (userId === admin.id) throw new DomainError("INVALID", "You can't disable yourself.");
    await prisma.user.update({ where: { id: userId }, data: { disabledAt: disable ? new Date() : null } });
    if (disable) await revokeAllSessions(userId);
    await audit(admin.id, disable ? "user.disable" : "user.enable", "User", userId);
    return ok(undefined, "/admin/buyers");
  } catch (e) {
    return toActionError(e);
  }
}

export async function toggleFlagAction(key: string): Promise<ActionState> {
  try {
    const admin = await assertAdmin("settings:manage");
    const f = await prisma.featureFlag.findUniqueOrThrow({ where: { key } });
    await prisma.featureFlag.update({ where: { key }, data: { enabled: !f.enabled, updatedById: admin.id } });
    await audit(admin.id, "flag.toggle", "FeatureFlag", key, { enabled: !f.enabled });
    return ok(undefined, "/admin/settings");
  } catch (e) {
    return toActionError(e);
  }
}

export async function bankSettingsAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin("settings:manage");
    const value = { accountName: str(fd, "accountName"), bankName: str(fd, "bankName"), iban: str(fd, "iban"), swift: str(fd, "swift"), instructions: str(fd, "instructions") };
    await prisma.platformSetting.upsert({ where: { key: "bankTransfer" }, create: { key: "bankTransfer", value }, update: { value } });
    await audit(admin.id, "settings.bank", "PlatformSetting", "bankTransfer");
    return ok("Saved.", "/admin/settings");
  } catch (e) {
    return toActionError(e);
  }
}
