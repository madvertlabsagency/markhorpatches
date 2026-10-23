import "server-only";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { alertAdmins, notify, orgUserIds } from "@/lib/notifications";
import { siteUrl } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { patchTypeName } from "@/lib/catalog";
import { trackEvent } from "@/lib/analytics/events";
import { DEFAULT_WEIGHTS, MATCHING_ALGORITHM_VERSION, normalizeWeights, rankSellers, type FactorKey, type MatchSeller } from "@/lib/matching/engine";
import { priceOpportunity, validateManualPrice, type PricingRuleLike } from "@/lib/pricing/engine";
import { isSellableTier } from "@/lib/rfq/qualification";
import { DomainError, featureEnabled, notifyBuyer, setRfqStatus } from "@/lib/domain/rfq";
import type { DistributionMode, Prisma } from "@/generated/prisma/client";

export async function activeMatchingConfig() {
  const cfg = await prisma.matchingConfiguration.findFirst({ where: { active: true }, orderBy: { createdAt: "desc" } });
  return {
    id: cfg?.id ?? null,
    version: cfg?.version ?? "default",
    weights: cfg ? normalizeWeights(cfg.weights as Partial<Record<FactorKey, number>>) : DEFAULT_WEIGHTS,
    minScore: cfg?.minScore ?? 40,
    maxNotified: cfg?.maxNotified ?? 5,
  };
}

export async function loadMatchSellers(where: Prisma.SellerProfileWhereInput = {}): Promise<MatchSeller[]> {
  const sellers = await prisma.sellerProfile.findMany({
    where: { verificationStatus: "VERIFIED", ...where },
    include: { capabilities: true, _count: { select: { portfolio: true, unlocks: true } }, disputes: { select: { status: true } } },
  });
  return sellers.map((s) => {
    const decided = s.disputes.filter((d) => d.status !== "OPEN" && d.status !== "UNDER_REVIEW");
    const upheld = decided.filter((d) => d.status === "RESOLVED_CREDIT" || d.status === "RESOLVED_REFUND").length;
    return {
      id: s.id, name: s.tradingName ?? s.legalName, country: s.country, verificationStatus: s.verificationStatus, availability: s.availability,
      capabilities: s.capabilities, backingOptions: s.backingOptions, borderOptions: s.borderOptions, shippingCountries: s.shippingCountries,
      artworkSupport: s.artworkSupport, rushCapable: s.rushCapable, minBudgetMinor: s.minBudgetMinor, yearsOperating: s.yearsOperating,
      portfolioCount: s._count.portfolio, avgResponseMinutes: s.avgResponseMinutes, quotesSubmitted: s.quotesSubmitted,
      upheldDisputeRate: s._count.unlocks >= 5 ? upheld / s._count.unlocks : null,
    };
  });
}

/** Runs (or re-runs) matching. Never fabricates matches: zero eligible sellers → manual sourcing. */
export async function runMatching(rfqId: string, actorId: string | null = null) {
  const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: rfqId }, include: { spec: true, _count: { select: { artwork: true } }, matches: true } });
  if (!rfq.spec) throw new DomainError("INVALID", "RFQ has no specification");
  if (!["QUALIFIED", "MATCHING", "MANUAL_SOURCING", "SELLER_NOTIFIED"].includes(rfq.status)) throw new DomainError("STATE", `RFQ is ${rfq.status}; only qualified RFQs can be matched.`);
  const config = await activeMatchingConfig();
  const sellers = await loadMatchSellers({ isDemo: rfq.isDemo });
  const s = rfq.spec;
  const results = rankSellers(
    {
      patchType: rfq.patchType, quantity: s.quantity, backing: s.backing, borderType: s.borderType, destinationCountry: s.destinationCountry, requiredBy: s.requiredBy,
      rush: s.rush, hasArtwork: rfq._count.artwork > 0, budgetTotalMinor: s.budgetTotalMinor, targetUnitMinor: s.targetUnitMinor, budgetUndisclosed: s.budgetUndisclosed,
    },
    sellers,
    config.weights,
  );
  const existing = new Map(rfq.matches.map((m) => [m.sellerId, m]));
  const eligible = results.filter((r) => r.eligible && r.score >= config.minScore);

  await prisma.$transaction(async (tx) => {
    for (const r of results) {
      const prev = existing.get(r.sellerId);
      const keepStatus = prev && (prev.status === "REJECTED" || prev.status === "NOTIFIED") ? prev.status : undefined;
      const data = {
        eligible: r.eligible && r.score >= config.minScore,
        ineligibleReasons: r.eligible && r.score < config.minScore ? [`Score ${r.score} below minimum ${config.minScore}`] : r.ineligibleReasons,
        score: r.score, breakdown: r.breakdown as unknown as Prisma.InputJsonValue, explanation: r.explanation, algorithmVersion: MATCHING_ALGORITHM_VERSION, configId: config.id,
      };
      await tx.rfqMatch.upsert({
        where: { rfqId_sellerId: { rfqId, sellerId: r.sellerId } },
        create: { rfqId, sellerId: r.sellerId, status: "PROPOSED", ...data },
        // A seller who became ineligible loses access even if previously notified.
        update: { ...data, status: !data.eligible && keepStatus === "NOTIFIED" ? "REJECTED" : keepStatus ?? "PROPOSED" },
      });
    }
    if (eligible.length === 0) {
      await setRfqStatus(tx, rfqId, "MANUAL_SOURCING", { actorId, note: `No eligible manufacturers among ${sellers.length} verified sellers`, force: rfq.status === "QUALIFIED" });
    } else if (rfq.status === "QUALIFIED" || rfq.status === "MANUAL_SOURCING") {
      await setRfqStatus(tx, rfqId, "MATCHING", { actorId, note: `${eligible.length} eligible manufacturer(s)` });
    }
    if (actorId) await audit(actorId, "rfq.rematch", "Rfq", rfqId, { eligible: eligible.length, version: MATCHING_ALGORITHM_VERSION }, tx);
  });

  if (eligible.length === 0) {
    await alertAdmins("Unmatched RFQ", `${rfq.publicRef} has no eligible manufacturer — manual sourcing required.`, `/admin/matching/${rfq.id}`, `unmatched:${rfq.id}:${new Date().toISOString().slice(0, 10)}`);
    await notifyBuyer(rfqId, "rfq_manual_sourcing", "We're sourcing manually", "No manufacturer on the platform matched every requirement yet. Our team is reaching out to suitable suppliers and will update you.");
  } else {
    await trackEvent("RFQMatched", { rfqId, props: { eligible: eligible.length }, isDemo: rfq.isDemo });
    if (await featureEnabled("auto_publish_matched")) {
      try {
        await publishOpportunity(rfqId, null, { distributionMode: "EXCLUSIVE" });
      } catch (e) {
        console.error("[matching] auto-publish failed", e);
      }
    }
  }
  return { eligible: eligible.length, evaluated: results.length };
}

export async function adminOverrideMatch(actorId: string, matchId: string, action: "APPROVE" | "REJECT", note: string) {
  const match = await prisma.rfqMatch.findUniqueOrThrow({ where: { id: matchId } });
  if (action === "APPROVE" && !match.eligible) throw new DomainError("INELIGIBLE", "Hard eligibility filters failed for this seller. Admin approval cannot override eligibility.");
  await prisma.$transaction(async (tx) => {
    await tx.rfqMatch.update({ where: { id: matchId }, data: { status: action === "APPROVE" ? "APPROVED" : "REJECTED", overriddenById: actorId, overrideNote: note } });
    await audit(actorId, `match.${action.toLowerCase()}`, "RfqMatch", matchId, { rfqId: match.rfqId, sellerId: match.sellerId, note }, tx);
  });
}

export async function loadPricingRules(): Promise<PricingRuleLike[]> {
  return prisma.pricingRule.findMany({ where: { active: true } });
}

export interface PublishOptions {
  distributionMode: DistributionMode;
  maxUnlocks?: number;
  priceOverrideMinor?: number;
  assignedSellerIds?: string[];
}

/**
 * Publishes the sellable opportunity. Enforces: sellable tier, verified email, buyer consent,
 * consent-bound recipient cap, distribution mode rules and transparent pricing.
 */
export async function publishOpportunity(rfqId: string, actorId: string | null, opts: PublishOptions) {
  const rfq = await prisma.rfq.findUniqueOrThrow({
    where: { id: rfqId },
    include: { qualifications: { where: { isCurrent: true } }, consents: true, matches: true, opportunity: true, spec: true },
  });
  const q = rfq.qualifications[0];
  if (!q || !isSellableTier(q.tier)) throw new DomainError("NOT_SELLABLE", "Only Tier A or B RFQs meeting the published quality criteria can be sold.");
  if (!rfq.emailVerifiedAt) throw new DomainError("NOT_VERIFIED", "Buyer email is not verified.");
  if (!["MATCHING", "SELLER_NOTIFIED", "MANUAL_SOURCING"].includes(rfq.status)) throw new DomainError("STATE", `RFQ is ${rfq.status}. Run matching first.`);
  const granted = (kind: string) => rfq.consents.some((c) => c.kind === kind && c.granted);
  if (!granted("SUPPLIER_MATCHING") || !granted("DATA_SHARING")) throw new DomainError("NO_CONSENT", "The buyer has not consented to supplier matching and data sharing.");

  let maxUnlocks = 1;
  if (opts.distributionMode === "LIMITED_SHARED") {
    if (!(await featureEnabled("limited_shared_rfqs"))) throw new DomainError("DISABLED", "Limited shared RFQs are disabled until the buyer-consent workflow is approved.");
    maxUnlocks = Math.min(opts.maxUnlocks ?? 2, rfq.maxRecipients);
    if (maxUnlocks < 2) throw new DomainError("NO_CONSENT", `The buyer consented to at most ${rfq.maxRecipients} recipient(s).`);
  }
  if (rfq.opportunity && rfq.opportunity.unlockCount > 0) {
    if (rfq.opportunity.distributionMode !== opts.distributionMode) throw new DomainError("STATE", "Distribution mode cannot change after a purchase.");
    maxUnlocks = Math.max(maxUnlocks, rfq.opportunity.unlockCount);
  }
  if (maxUnlocks > rfq.maxRecipients) throw new DomainError("NO_CONSENT", `The buyer consented to at most ${rfq.maxRecipients} recipient(s).`);

  // Recipients.
  let recipients: string[] = [];
  const config = await activeMatchingConfig();
  if (opts.distributionMode === "PRIVATE_INVITATION" || opts.distributionMode === "ADMIN_ASSIGNMENT") {
    if (!actorId) throw new DomainError("INVALID", "Invitations and assignments require an admin.");
    const ids = [...new Set(opts.assignedSellerIds ?? [])];
    if (!ids.length) throw new DomainError("INVALID", "Choose at least one manufacturer.");
    if (opts.distributionMode === "ADMIN_ASSIGNMENT" && ids.length !== 1) throw new DomainError("INVALID", "Admin assignment targets exactly one manufacturer.");
    const eligible = new Set(rfq.matches.filter((m) => m.eligible).map((m) => m.sellerId));
    const bad = ids.filter((id) => !eligible.has(id));
    if (bad.length) throw new DomainError("INELIGIBLE", "Only manufacturers that pass the eligibility filters can be invited or assigned.");
    recipients = ids;
  } else {
    recipients = rfq.matches
      .filter((m) => m.eligible && m.status !== "REJECTED")
      .sort((a, b) => Number(b.status === "APPROVED") - Number(a.status === "APPROVED") || b.score - a.score)
      .slice(0, config.maxNotified)
      .map((m) => m.sellerId);
    if (!recipients.length) throw new DomainError("NO_MATCH", "No eligible manufacturers to notify. The RFQ stays in manual sourcing.");
  }

  // Price (fixed at publish time, shown before purchase).
  let priceMinor: number;
  let pricingRuleId: string | null = null;
  let overridden = false;
  if (opts.priceOverrideMinor !== undefined) {
    const err = validateManualPrice(opts.priceOverrideMinor);
    if (err) throw new DomainError("PRICE", err);
    priceMinor = opts.priceOverrideMinor;
    overridden = true;
  } else {
    const quote = priceOpportunity(await loadPricingRules(), q.pricingTier, rfq.patchType, opts.distributionMode);
    if (!quote) throw new DomainError("PRICE", "Enterprise RFQs need a manually set price.");
    priceMinor = quote.priceMinor;
    pricingRuleId = quote.ruleId;
  }

  const opp = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const data = {
      status: "AVAILABLE" as const, distributionMode: opts.distributionMode, maxUnlocks, priceMinor, currency: "USD", pricingTier: q.pricingTier,
      pricingRuleId, priceOverridden: overridden, publishedAt: now, publishedById: actorId, expiresAt: new Date(now.getTime() + 14 * 86_400_000), isDemo: rfq.isDemo,
    };
    const o = rfq.opportunity
      ? await tx.opportunity.update({ where: { id: rfq.opportunity.id }, data: { ...data, status: rfq.opportunity.unlockCount >= maxUnlocks ? "SOLD_OUT" : "AVAILABLE" } })
      : await tx.opportunity.create({ data: { rfqId, ...data } });
    if (!rfq.opportunity || rfq.opportunity.priceMinor !== priceMinor) {
      await tx.opportunityPriceEvent.create({ data: { opportunityId: o.id, priceMinor, currency: "USD", pricingRuleId, reason: overridden ? "Manual override" : "Published", actorId } });
    }
    if (opts.distributionMode === "PRIVATE_INVITATION" || opts.distributionMode === "ADMIN_ASSIGNMENT") {
      for (const sellerId of recipients) {
        await tx.rfqAssignment.upsert({ where: { rfqId_sellerId: { rfqId, sellerId } }, create: { rfqId, sellerId, kind: opts.distributionMode, createdById: actorId! }, update: { kind: opts.distributionMode } });
      }
    }
    await tx.rfqMatch.updateMany({ where: { rfqId, sellerId: { in: recipients } }, data: { status: "NOTIFIED", notifiedAt: now } });
    await setRfqStatus(tx, rfqId, "SELLER_NOTIFIED", { actorId, note: `${opts.distributionMode} opportunity published to ${recipients.length} manufacturer(s)`, force: rfq.status === "MANUAL_SOURCING" });
    if (actorId) await audit(actorId, "opportunity.publish", "Opportunity", o.id, { rfqId, mode: opts.distributionMode, maxUnlocks, priceMinor, recipients }, tx);
    return o;
  });

  // Anonymised notifications (no buyer identity).
  const s = rfq.spec!;
  const size = s.width && s.height ? `${s.width}×${s.height}${s.unit.toLowerCase()}` : "size TBC";
  const summary = `${s.quantity.toLocaleString("en-US")} × ${patchTypeName(rfq.patchType).toLowerCase()}, ${size}, to ${s.destinationState ? `${s.destinationState}, ` : ""}${s.destinationCountry}`;
  const sellers = await prisma.sellerProfile.findMany({ where: { id: { in: recipients } }, select: { id: true, orgId: true, notificationPrefs: true } });
  for (const seller of sellers) {
    const prefs = (seller.notificationPrefs ?? {}) as { emailOpportunities?: boolean };
    await notify({
      userIds: await orgUserIds(seller.orgId),
      type: "opportunity_available",
      title: `New matching RFQ ${rfq.publicRef}`,
      body: `${summary}. Unlock price ${formatMoney(priceMinor)}.`,
      link: `/seller/opportunities/${rfq.id}`,
      dedupeKey: `opportunity:${opp.id}:${seller.id}`,
      email: prefs.emailOpportunities === false ? undefined : { template: "opportunity_available", data: { ref: rfq.publicRef, summary, price: formatMoney(priceMinor), url: siteUrl(`/seller/opportunities/${rfq.id}`) } },
    });
  }
  await notifyBuyer(rfqId, "rfq_sellers_notified", "Manufacturers notified", `We shared an anonymised summary of your request with ${recipients.length} verified manufacturer(s). Your contact details stay private until a manufacturer is approved to receive them.`);
  return opp;
}

export async function setOpportunityStatus(actorId: string, rfqId: string, to: "PAUSED" | "AVAILABLE" | "WITHDRAWN") {
  const opp = await prisma.opportunity.findUniqueOrThrow({ where: { rfqId } });
  const { assertTransition, OPPORTUNITY_TRANSITIONS } = await import("@/lib/state-machines");
  assertTransition("opportunity", OPPORTUNITY_TRANSITIONS, opp.status, to);
  await prisma.$transaction(async (tx) => {
    await tx.opportunity.update({ where: { id: opp.id }, data: { status: to } });
    if (to !== "AVAILABLE") await tx.rfqReservation.updateMany({ where: { rfqId, status: "ACTIVE" }, data: { status: "RELEASED", releasedReason: `Opportunity ${to.toLowerCase()} by admin` } });
    await audit(actorId, `opportunity.${to.toLowerCase()}`, "Opportunity", opp.id, { rfqId }, tx);
  });
}
