import "server-only";
import { prisma } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { siteUrl } from "@/lib/env";
import { toMinor } from "@/lib/money";
import { enqueue } from "@/lib/jobs/queue";
import { alertAdmins, notify, queueEmail } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { trackEvent } from "@/lib/analytics/events";
import { newRfqRef } from "@/lib/rfq/refs";
import { CONSENT_TEXT, CONSENT_VERSION, sharingText, type RfqSubmission } from "@/lib/rfq/schema";
import { qualifyRfq, QUALIFICATION_RULES_VERSION } from "@/lib/rfq/qualification";
import { redactContactInfo } from "@/lib/rfq/disclosure";
import { assertTransition, RFQ_TRANSITIONS, RFQ_STATUS_LABEL } from "@/lib/state-machines";
import type { Prisma, RfqStatus } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export class DomainError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export async function setRfqStatus(tx: Tx, rfqId: string, to: RfqStatus, opts: { actorId?: string | null; note?: string; force?: boolean } = {}) {
  const rfq = await tx.rfq.findUniqueOrThrow({ where: { id: rfqId }, select: { status: true } });
  if (rfq.status === to) return;
  if (!opts.force) assertTransition("rfq", RFQ_TRANSITIONS, rfq.status, to);
  const data: Prisma.RfqUpdateInput = { status: to };
  if (to === "QUALIFIED") data.qualifiedAt = new Date();
  if (to === "CLOSED" || to === "CANCELLED" || to === "EXPIRED") data.closedAt = new Date();
  await tx.rfq.update({ where: { id: rfqId }, data });
  await tx.rfqStatusEvent.create({ data: { rfqId, from: rfq.status, to, note: opts.note, actorId: opts.actorId ?? null } });
}

export interface SubmitContext {
  userId?: string | null;
  userEmailVerified?: boolean;
  buyerOrgId?: string | null;
  guestOwnerHash?: string | null;
  ip?: string;
  userAgent?: string | null;
  attribution?: Record<string, string | undefined>;
  isDemo?: boolean;
}

/** Creates a submitted RFQ with its specification, artwork links, consent records and attribution. */
export async function createRfq(input: RfqSubmission, ctx: SubmitContext) {
  if (input.website2) throw new DomainError("SPAM", "Submission rejected.");
  const verifiedViaAccount = !!ctx.userId && !!ctx.userEmailVerified;

  // Artwork must be READY, unattached, and owned by this guest draft or this user.
  if (input.artworkIds.length) {
    const files = await prisma.attachment.findMany({ where: { id: { in: input.artworkIds } }, include: { rfqArtwork: true } });
    const owned = files.filter(
      (f) => f.purpose === "RFQ_ARTWORK" && f.status === "READY" && !f.rfqArtwork && ((ctx.userId && f.uploaderUserId === ctx.userId) || (ctx.guestOwnerHash && f.guestOwnerHash === ctx.guestOwnerHash)),
    );
    if (owned.length !== input.artworkIds.length) throw new DomainError("ARTWORK", "One or more artwork files could not be attached. Please re-upload them.");
  }

  const guestToken = randomToken(24);
  const maxRecipients = 1; // Launch default: exclusive. Limited-shared consent is behind a feature flag.
  const currency = "USD";

  const rfq = await prisma.$transaction(async (tx) => {
    let publicRef = newRfqRef();
    for (let i = 0; i < 5 && (await tx.rfq.findUnique({ where: { publicRef } })); i++) publicRef = newRfqRef();
    const status: RfqStatus = verifiedViaAccount ? "UNDER_REVIEW" : "VERIFICATION_PENDING";
    const created = await tx.rfq.create({
      data: {
        publicRef,
        status,
        patchType: input.patchType,
        intendedUse: input.intendedUse,
        intendedUseOther: input.intendedUseOther,
        buyerOrgId: ctx.buyerOrgId ?? null,
        buyerUserId: ctx.userId ?? null,
        contactName: input.contactName,
        contactCompany: input.contactCompany,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        contactWebsite: input.contactWebsite,
        preferredContact: input.preferredContact,
        disclosureMode: input.disclosureMode,
        maxRecipients,
        emailVerifiedAt: verifiedViaAccount ? new Date() : null,
        guestAccessHash: sha256(guestToken),
        submittedAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 86_400_000),
        submitIp: ctx.ip,
        isDemo: !!ctx.isDemo,
        spec: {
          create: {
            width: input.width,
            height: input.height,
            unit: input.unit,
            shape: input.shape,
            borderType: input.borderType,
            material: input.material,
            thickness: input.thickness,
            quantity: input.quantity,
            minQuantity: input.minQuantity,
            repeatPotential: input.repeatPotential,
            sampleRequired: input.sampleRequired,
            backing: input.backing,
            backingOther: input.backingOther,
            colorCount: input.colorCount,
            specialFinishing: input.specialFinishing,
            destinationCountry: input.destinationCountry,
            destinationState: input.destinationState,
            destinationPostal: input.destinationPostal,
            requiredBy: input.requiredBy ? new Date(`${input.requiredBy}T00:00:00Z`) : null,
            rush: input.rush,
            sampleBeforeProduction: input.sampleBeforeProduction,
            budgetUndisclosed: input.budgetUndisclosed,
            budgetTotalMinor: !input.budgetUndisclosed && input.budgetTotal !== undefined ? toMinor(input.budgetTotal, currency) : null,
            targetUnitMinor: !input.budgetUndisclosed && input.targetUnit !== undefined ? toMinor(input.targetUnit, currency) : null,
            budgetFlexibility: input.budgetUndisclosed ? null : input.budgetFlexibility,
            currency,
            artworkNotes: input.artworkNotes,
          },
        },
        artwork: { create: input.artworkIds.map((attachmentId, sortOrder) => ({ attachmentId, sortOrder })) },
      },
    });
    await tx.rfqStatusEvent.create({ data: { rfqId: created.id, from: null, to: status, note: "Submitted by buyer" } });

    const consentBase = { email: input.contactEmail, userId: ctx.userId ?? null, rfqId: created.id, textVersion: CONSENT_VERSION, ipAddress: ctx.ip, userAgent: ctx.userAgent ?? undefined };
    const share = sharingText(input.disclosureMode, maxRecipients);
    await tx.consentRecord.createMany({
      data: [
        { ...consentBase, kind: "TERMS", granted: true, textHash: sha256(CONSENT_TEXT.TERMS) },
        { ...consentBase, kind: "SUPPLIER_MATCHING", granted: true, textHash: sha256(CONSENT_TEXT.SUPPLIER_MATCHING) },
        { ...consentBase, kind: "DATA_SHARING", granted: true, textHash: sha256(share), maxRecipients, disclosureMode: input.disclosureMode },
        { ...consentBase, kind: "MARKETING", granted: input.consentMarketing, textHash: sha256(CONSENT_TEXT.MARKETING) },
      ],
    });
    // Artwork now belongs to the RFQ (and the buyer org, when known).
    if (input.artworkIds.length) await tx.attachment.updateMany({ where: { id: { in: input.artworkIds } }, data: { ownerOrgId: ctx.buyerOrgId ?? null } });
    const a = ctx.attribution ?? {};
    if (Object.values(a).some(Boolean)) {
      await tx.marketingAttribution.create({
        data: {
          rfqId: created.id, utmSource: a.utm_source, utmMedium: a.utm_medium, utmCampaign: a.utm_campaign, utmContent: a.utm_content, utmTerm: a.utm_term,
          gclid: a.gclid, fbclid: a.fbclid, landingPage: a.landing_page?.slice(0, 500), referrer: a.referrer?.slice(0, 500),
        },
      });
    }

    if (verifiedViaAccount) {
      await enqueue("rfq.process", { rfqId: created.id }, { dedupeKey: `rfq.process:${created.id}:submit`, tx });
    } else {
      const token = randomToken();
      await tx.verificationToken.create({ data: { tokenHash: sha256(token), purpose: "RFQ_EMAIL_VERIFY", email: input.contactEmail, data: { rfqId: created.id }, expiresAt: new Date(Date.now() + 72 * 3_600_000) } });
      await queueEmail(
        input.contactEmail,
        "rfq_received",
        { name: input.contactName.split(" ")[0], ref: publicRef, verifyUrl: siteUrl(`/rfq/verify?token=${token}`), trackUrl: siteUrl(`/rfq/track/${publicRef}?t=${guestToken}`) },
        `rfq_received:${created.id}`,
        tx,
      );
    }
    return created;
  });

  await trackEvent("RFQSubmitted", { rfqId: rfq.id, userId: ctx.userId ?? undefined, props: { patchType: input.patchType, quantity: input.quantity, verifiedViaAccount }, isDemo: rfq.isDemo });
  return { rfq, guestToken };
}

/** Buyer clicked the emailed link. */
export async function verifyRfqEmail(token: string) {
  const vt = await prisma.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!vt || vt.purpose !== "RFQ_EMAIL_VERIFY") return { ok: false as const, reason: "This link is invalid." };
  const rfqId = (vt.data as { rfqId?: string } | null)?.rfqId;
  if (!rfqId) return { ok: false as const, reason: "This link is invalid." };
  const rfq = await prisma.rfq.findUnique({ where: { id: rfqId } });
  if (!rfq) return { ok: false as const, reason: "Request not found." };
  if (rfq.emailVerifiedAt) return { ok: true as const, rfq, already: true };
  if (vt.usedAt || vt.expiresAt < new Date()) return { ok: false as const, reason: "This link has expired. Submit your request again or contact support.", rfq };
  await prisma.$transaction(async (tx) => {
    await tx.verificationToken.update({ where: { id: vt.id }, data: { usedAt: new Date() } });
    await tx.rfq.update({ where: { id: rfqId }, data: { emailVerifiedAt: new Date() } });
    if (rfq.status === "VERIFICATION_PENDING") await setRfqStatus(tx, rfqId, "UNDER_REVIEW", { note: "Email verified" });
    await enqueue("rfq.process", { rfqId }, { dedupeKey: `rfq.process:${rfqId}:verify`, tx });
    // Link to an existing account with the same verified email.
    const user = await tx.user.findUnique({ where: { email: rfq.contactEmail }, include: { memberships: { include: { org: true } } } });
    const buyerOrg = user?.emailVerifiedAt ? user.memberships.find((m) => m.org.type === "BUYER")?.org : null;
    if (user && buyerOrg && !rfq.buyerOrgId) await tx.rfq.update({ where: { id: rfqId }, data: { buyerOrgId: buyerOrg.id, buyerUserId: user.id } });
  });
  await trackEvent("RFQVerified", { rfqId, isDemo: rfq.isDemo });
  return { ok: true as const, rfq, already: false };
}

/** Job: run the qualification engine and route the RFQ (human review by default). */
export async function processRfq(rfqId: string) {
  const rfq = await prisma.rfq.findUnique({ where: { id: rfqId }, include: { spec: true, _count: { select: { artwork: true } } } });
  if (!rfq || !rfq.spec) return;
  if (!["UNDER_REVIEW", "CLARIFICATION_REQUIRED"].includes(rfq.status)) return;
  const since7d = new Date(Date.now() - 7 * 86_400_000);
  const since24h = new Date(Date.now() - 86_400_000);
  const [dupes, sameIp] = await Promise.all([
    prisma.rfq.count({ where: { id: { not: rfq.id }, contactEmail: rfq.contactEmail, patchType: rfq.patchType, createdAt: { gte: since7d }, status: { notIn: ["CANCELLED", "DRAFT"] } } }),
    rfq.submitIp ? prisma.rfq.count({ where: { id: { not: rfq.id }, submitIp: rfq.submitIp, createdAt: { gte: since24h } } }) : Promise.resolve(0),
  ]);
  const s = rfq.spec;
  const result = qualifyRfq({
    patchType: rfq.patchType, quantity: s.quantity, width: s.width, height: s.height, backing: s.backing, borderType: s.borderType, colorCount: s.colorCount,
    artworkCount: rfq._count.artwork, destinationCountry: s.destinationCountry, destinationPostal: s.destinationPostal, requiredBy: s.requiredBy,
    budgetTotalMinor: s.budgetTotalMinor, targetUnitMinor: s.targetUnitMinor, budgetUndisclosed: s.budgetUndisclosed, notes: s.notes, artworkNotes: s.artworkNotes,
    contactName: rfq.contactName, contactEmail: rfq.contactEmail, contactPhone: rfq.contactPhone, contactCompany: rfq.contactCompany, contactWebsite: rfq.contactWebsite,
    emailVerified: !!rfq.emailVerifiedAt, recentDuplicateCount: dupes, recentSameIpCount: sameIp,
  });

  await prisma.$transaction(async (tx) => {
    await tx.rfqQualification.updateMany({ where: { rfqId, isCurrent: true }, data: { isCurrent: false } });
    await tx.rfqQualification.create({
      data: {
        rfqId, isCurrent: true, tier: result.tier, pricingTier: result.pricingTier, score: result.score, completenessScore: result.completenessScore,
        intentScore: result.intentScore, fraudScore: result.fraudScore, source: "SYSTEM", needsHumanReview: result.needsHumanReview,
        missingFields: result.missingFields, clarificationQuestions: result.clarificationQuestions, reasons: result.reasons, rulesVersion: QUALIFICATION_RULES_VERSION,
        signals: { create: result.signals.map((sg) => ({ code: sg.code, category: sg.category, weight: sg.weight, detail: sg.detail })) },
      },
    });
    if (result.isDuplicate) {
      const original = await tx.rfq.findFirst({ where: { id: { not: rfq.id }, contactEmail: rfq.contactEmail, patchType: rfq.patchType, createdAt: { gte: since7d } }, orderBy: { createdAt: "asc" } });
      if (original) await tx.rfq.update({ where: { id: rfq.id }, data: { duplicateOfId: original.id } });
    }
    if (rfq.status === "CLARIFICATION_REQUIRED") await setRfqStatus(tx, rfqId, "UNDER_REVIEW", { note: "Buyer updated details" });
  });
  await enqueue("ai.enrich_rfq", { rfqId }, { dedupeKey: `ai.enrich:${rfqId}:${Date.now()}` });

  const autoQualify = await featureEnabled("auto_qualify_tier_a");
  if (!result.needsHumanReview && autoQualify) {
    await adminQualifyRfq(null, rfqId, { tier: "A", pricingTier: result.pricingTier, note: "Auto-qualified (Tier A, low risk)", source: "SYSTEM" });
    return;
  }
  const isFraud = result.tier === "D";
  await alertAdmins(
    isFraud ? "Fraud/quality alert" : "New RFQ for review",
    `${rfq.publicRef}: Tier ${result.tier} (completeness ${result.completenessScore}, intent ${result.intentScore}, risk ${result.fraudScore}).`,
    `/admin/rfq-review/${rfq.id}`,
    `rfq_review:${rfq.id}:${QUALIFICATION_RULES_VERSION}:${result.tier}`,
    ["SUPER_ADMIN", "ADMIN", "REVIEWER"],
  );
}

export async function featureEnabled(key: string) {
  const f = await prisma.featureFlag.findUnique({ where: { key } });
  return !!f?.enabled;
}

/** Admin (or system) qualifies an RFQ for matching. Records a new qualification decision. */
export async function adminQualifyRfq(
  actorId: string | null,
  rfqId: string,
  opts: { tier: "A" | "B"; pricingTier: "STANDARD" | "HIGH_INTENT" | "PREMIUM" | "ENTERPRISE"; note?: string; source?: "ADMIN" | "SYSTEM" },
) {
  const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: rfqId }, include: { qualifications: { where: { isCurrent: true } } } });
  if (!rfq.emailVerifiedAt) throw new DomainError("NOT_VERIFIED", "The buyer has not verified their email yet. Unverified RFQs cannot be qualified.");
  const current = rfq.qualifications[0];
  await prisma.$transaction(async (tx) => {
    await tx.rfqQualification.updateMany({ where: { rfqId, isCurrent: true }, data: { isCurrent: false } });
    await tx.rfqQualification.create({
      data: {
        rfqId, isCurrent: true, tier: opts.tier, pricingTier: opts.pricingTier, score: current?.score ?? 0, completenessScore: current?.completenessScore ?? 0,
        intentScore: current?.intentScore ?? 0, fraudScore: current?.fraudScore ?? 0, source: opts.source ?? "ADMIN", reviewerId: actorId, needsHumanReview: false,
        missingFields: current?.missingFields ?? [], clarificationQuestions: current?.clarificationQuestions ?? undefined,
        reasons: [opts.note ?? "Approved by reviewer", ...(current && current.tier !== opts.tier ? [`Tier corrected from ${current.tier} to ${opts.tier}`] : [])],
        rulesVersion: QUALIFICATION_RULES_VERSION,
      },
    });
    await setRfqStatus(tx, rfqId, "QUALIFIED", { actorId, note: opts.note });
    await enqueue("rfq.match", { rfqId }, { dedupeKey: `rfq.match:${rfqId}:${Date.now()}`, tx });
    if (actorId) await audit(actorId, "rfq.qualify", "Rfq", rfqId, { tier: opts.tier, pricingTier: opts.pricingTier, previousTier: current?.tier }, tx);
  });
  await notifyBuyer(rfqId, "rfq_qualified", "Your request is qualified", "We're now matching your request with verified manufacturers.");
}

export async function adminRequestClarification(actorId: string, rfqId: string, questions: string[]) {
  const qs = questions.map((q) => q.trim()).filter(Boolean).slice(0, 8);
  if (!qs.length) throw new DomainError("INVALID", "Add at least one question.");
  const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: rfqId } });
  await prisma.$transaction(async (tx) => {
    await setRfqStatus(tx, rfqId, "CLARIFICATION_REQUIRED", { actorId, note: qs.join(" | ") });
    await tx.rfqQualification.updateMany({ where: { rfqId, isCurrent: true }, data: { clarificationQuestions: qs } });
    await audit(actorId, "rfq.request_clarification", "Rfq", rfqId, { questions: qs }, tx);
  });
  await queueEmail(rfq.contactEmail, "rfq_clarification", { name: rfq.contactName.split(" ")[0], ref: rfq.publicRef, questions: qs.map((q) => `• ${q}`).join("\n"), url: siteUrl(`/buyer/rfqs/${rfq.id}`) }, `rfq_clarify:${rfqId}:${sha256(qs.join("|")).slice(0, 12)}`);
  await notifyBuyer(rfqId, "rfq_clarification", "Clarification needed", qs[0]);
}

export async function adminRejectRfq(actorId: string, rfqId: string, reason: string) {
  await prisma.$transaction(async (tx) => {
    const current = await tx.rfqQualification.findFirst({ where: { rfqId, isCurrent: true } });
    await tx.rfqQualification.updateMany({ where: { rfqId, isCurrent: true }, data: { isCurrent: false } });
    await tx.rfqQualification.create({
      data: {
        rfqId, isCurrent: true, tier: "D", pricingTier: "STANDARD", score: current?.score ?? 0, completenessScore: current?.completenessScore ?? 0, intentScore: current?.intentScore ?? 0,
        fraudScore: current?.fraudScore ?? 0, source: "ADMIN", reviewerId: actorId, needsHumanReview: false, reasons: [reason], rulesVersion: QUALIFICATION_RULES_VERSION,
      },
    });
    await setRfqStatus(tx, rfqId, "CLOSED", { actorId, note: `Rejected: ${reason}`, force: true });
    await tx.rfq.update({ where: { id: rfqId }, data: { closeReason: reason } });
    await tx.opportunity.updateMany({ where: { rfqId, status: { in: ["DRAFT", "AVAILABLE", "PAUSED"] } }, data: { status: "WITHDRAWN" } });
    await audit(actorId, "rfq.reject", "Rfq", rfqId, { reason }, tx);
  });
}

/** Buyer answers clarification / edits permitted fields. Re-runs qualification. */
export async function buyerUpdateRfq(rfqId: string, actorUserId: string, patch: { notes?: string; width?: number; height?: number; backing?: string; colorCount?: number; requiredBy?: string; destinationPostal?: string; quantity?: number }) {
  const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: rfqId }, include: { spec: true } });
  if (!["VERIFICATION_PENDING", "UNDER_REVIEW", "CLARIFICATION_REQUIRED"].includes(rfq.status)) throw new DomainError("LOCKED", "This request can no longer be edited because it has been shared with manufacturers. Message them instead.");
  const notes = patch.notes?.trim() ? [rfq.spec?.notes, `[${new Date().toISOString().slice(0, 10)}] ${patch.notes.trim()}`].filter(Boolean).join("\n") : undefined;
  await prisma.$transaction(async (tx) => {
    await tx.rfqSpecification.update({
      where: { rfqId },
      data: {
        notes, width: patch.width, height: patch.height, backing: patch.backing as never, colorCount: patch.colorCount,
        requiredBy: patch.requiredBy ? new Date(`${patch.requiredBy}T00:00:00Z`) : undefined, destinationPostal: patch.destinationPostal, quantity: patch.quantity,
      },
    });
    await tx.rfqStatusEvent.create({ data: { rfqId, from: rfq.status, to: rfq.status, note: "Buyer updated request", actorId: actorUserId } });
    if (rfq.emailVerifiedAt) await enqueue("rfq.process", { rfqId }, { dedupeKey: `rfq.process:${rfqId}:${Date.now()}`, tx });
  });
}

export async function buyerCancelRfq(rfqId: string, actorUserId: string, reason: string) {
  await prisma.$transaction(async (tx) => {
    const rfq = await tx.rfq.findUniqueOrThrow({ where: { id: rfqId } });
    const to: RfqStatus = ["QUOTES_RECEIVED", "SELLER_SELECTED"].includes(rfq.status) ? "CLOSED" : "CANCELLED";
    await setRfqStatus(tx, rfqId, to, { actorId: actorUserId, note: reason || "Closed by buyer" });
    await tx.rfq.update({ where: { id: rfqId }, data: { closeReason: reason || "Closed by buyer" } });
    await tx.opportunity.updateMany({ where: { rfqId, status: { in: ["DRAFT", "AVAILABLE", "PAUSED"] } }, data: { status: "WITHDRAWN" } });
    await tx.rfqReservation.updateMany({ where: { rfqId, status: "ACTIVE" }, data: { status: "RELEASED", releasedReason: "RFQ closed by buyer" } });
  });
}

/** In-app + email notice to the buyer account (if any). Guests get email only. */
export async function notifyBuyer(rfqId: string, type: string, title: string, body: string) {
  const rfq = await prisma.rfq.findUnique({ where: { id: rfqId } });
  if (!rfq) return;
  const link = `/buyer/rfqs/${rfq.id}`;
  const data = { name: rfq.contactName.split(" ")[0], ref: rfq.publicRef, headline: title, message: body, url: siteUrl(link) };
  if (rfq.buyerUserId) {
    await notify({ userIds: [rfq.buyerUserId], type, title: `${title} — ${rfq.publicRef}`, body, link, dedupeKey: `${type}:${rfqId}`, email: { template: "rfq_status", data } });
  } else if (rfq.emailVerifiedAt) {
    await queueEmail(rfq.contactEmail, "rfq_status", data, `${type}:${rfqId}:guest`);
  }
}

export function buyerStatusMessage(status: RfqStatus): string {
  switch (status) {
    case "VERIFICATION_PENDING":
      return "Check your inbox and confirm your email so we can review your request.";
    case "UNDER_REVIEW":
      return "Our team is reviewing your request for completeness.";
    case "CLARIFICATION_REQUIRED":
      return "Manufacturers need a few more details. Please answer the questions below.";
    case "QUALIFIED":
    case "MATCHING":
      return "We're matching your request with verified manufacturers.";
    case "MANUAL_SOURCING":
      return "No manufacturer on the platform matched every requirement yet. Our team is sourcing suitable suppliers manually and will update you.";
    case "SELLER_NOTIFIED":
      return "Matched manufacturers have been notified. You'll hear from them here once they review your request.";
    case "QUOTES_RECEIVED":
      return "You have quotations to compare.";
    case "SELLER_SELECTED":
      return "You've selected a manufacturer. Arrange production directly with them.";
    default:
      return RFQ_STATUS_LABEL[status];
  }
}

/** Safe (redacted) text for places that must not leak contact details. */
export function safeNotes(s: string | null | undefined) {
  return redactContactInfo(s).text;
}
