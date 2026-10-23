import "server-only";
import { prisma } from "@/lib/db";

/**
 * Executive marketplace metrics computed from real records. Demo data is excluded unless
 * explicitly requested (and then labelled). Revenue = non-complimentary unlock prices net of
 * processed refunds/credits; REVOKED rows (paid-but-not-granted) are excluded.
 */
export interface Range {
  from: Date;
  to: Date;
}

export function rangeFromDays(days: number): Range {
  const to = new Date();
  return { from: new Date(to.getTime() - days * 86_400_000), to };
}

export async function executiveMetrics(range: Range, includeDemo = false) {
  const demo = includeDemo ? {} : { isDemo: false };
  const created = { gte: range.from, lte: range.to };
  const [rawLeads, verified, qualified, matched, sold, unlocks, refunds, adSpend, sellersTotal, sellersVerified, sellersActive30, payments, quotes, firstQuotes] = await Promise.all([
    prisma.rfq.count({ where: { ...demo, createdAt: created, status: { not: "DRAFT" } } }),
    prisma.rfq.count({ where: { ...demo, createdAt: created, emailVerifiedAt: { not: null } } }),
    prisma.rfq.count({ where: { ...demo, createdAt: created, qualifiedAt: { not: null } } }),
    prisma.rfq.count({ where: { ...demo, createdAt: created, matches: { some: { eligible: true } } } }),
    prisma.rfq.count({ where: { ...demo, createdAt: created, unlocks: { some: { status: { in: ["ACTIVE", "CREDITED", "REFUNDED"] } } } } }),
    prisma.rfqUnlock.findMany({ where: { ...demo, createdAt: created, status: { not: "REVOKED" }, method: { not: "COMPLIMENTARY" } }, select: { priceMinor: true, createdAt: true, rfqId: true, sellerId: true } }),
    prisma.refund.findMany({ where: { status: "PROCESSED", processedAt: created, unlock: includeDemo ? {} : { isDemo: false, status: { not: "REVOKED" } } }, select: { amountMinor: true } }),
    prisma.adSpendEntry.aggregate({ where: { date: created, ...demo }, _sum: { amountMinor: true, leads: true } }),
    prisma.sellerProfile.count({ where: demo }),
    prisma.sellerProfile.count({ where: { ...demo, verificationStatus: "VERIFIED" } }),
    prisma.sellerProfile.count({ where: { ...demo, unlocks: { some: { createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } } } }),
    prisma.payment.groupBy({ by: ["status"], where: { ...demo, createdAt: created, purpose: "RFQ_UNLOCK" }, _count: true }),
    prisma.quote.findMany({ where: { ...demo, submittedAt: { gte: range.from, lte: range.to } }, select: { submittedAt: true, rfqId: true, sellerId: true } }),
    prisma.rfqUnlock.findMany({ where: { ...demo, createdAt: created, status: "ACTIVE" }, select: { rfqId: true, sellerId: true, createdAt: true } }),
  ]);
  const gross = unlocks.reduce((a, u) => a + u.priceMinor, 0);
  const refunded = refunds.reduce((a, r) => a + r.amountMinor, 0);
  const net = gross - refunded;
  const spend = adSpend._sum.amountMinor ?? 0;
  const payTotal = payments.reduce((a, p) => a + p._count, 0);
  const paid = payments.filter((p) => p.status === "PAID" || p.status === "REFUNDED").reduce((a, p) => a + p._count, 0);
  const qMap = new Map(quotes.map((q) => [`${q.rfqId}:${q.sellerId}`, q.submittedAt!]));
  const responseHours = firstQuotes.map((u) => (qMap.get(`${u.rfqId}:${u.sellerId}`) ? (qMap.get(`${u.rfqId}:${u.sellerId}`)!.getTime() - u.createdAt.getTime()) / 3_600_000 : null)).filter((x): x is number => x !== null && x >= 0);
  const variableCostPerSold = Number(process.env.VARIABLE_COST_PER_SOLD_MINOR ?? 200);
  return {
    rawLeads, verified, qualified, matched, sold,
    unlockCount: unlocks.length,
    grossRevenueMinor: gross,
    refundsMinor: refunded,
    netRevenueMinor: net,
    revenuePerSoldMinor: unlocks.length ? Math.round(net / unlocks.length) : null,
    adSpendMinor: spend,
    buyerCplMinor: rawLeads && spend ? Math.round(spend / rawLeads) : null,
    effectiveCostPerSoldMinor: unlocks.length && spend ? Math.round((spend + unlocks.length * variableCostPerSold) / unlocks.length) : null,
    contributionMinor: net - spend - unlocks.length * variableCostPerSold,
    qualificationRate: verified ? qualified / verified : null,
    matchRate: qualified ? matched / qualified : null,
    sellThroughRate: matched ? sold / matched : null,
    refundRate: gross ? refunded / gross : null,
    paymentSuccessRate: payTotal ? paid / payTotal : null,
    sellersTotal, sellersVerified, sellersActive30,
    sellerActivation: sellersVerified ? sellersActive30 / sellersVerified : null,
    avgResponseHours: responseHours.length ? responseHours.reduce((a, b) => a + b, 0) / responseHours.length : null,
    dailyRevenue: bucketByDay(unlocks.map((u) => ({ at: u.createdAt, value: u.priceMinor })), range),
  };
}

export function bucketByDay(items: { at: Date; value: number }[], range: Range) {
  const days = Math.max(1, Math.min(90, Math.ceil((range.to.getTime() - range.from.getTime()) / 86_400_000)));
  const out: { label: string; value: number; key: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(range.to.getTime() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    out.push({ key, label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }), value: 0 });
  }
  const idx = new Map(out.map((o, i) => [o.key, i]));
  for (const it of items) {
    const i = idx.get(it.at.toISOString().slice(0, 10));
    if (i !== undefined) out[i].value += it.value;
  }
  return out;
}

export async function operationalQueues() {
  const [review, clarification, manual, verification, claims, failedPayments, deadJobs, reports, invoiceRequests] = await Promise.all([
    prisma.rfq.count({ where: { status: "UNDER_REVIEW" } }),
    prisma.rfq.count({ where: { status: "CLARIFICATION_REQUIRED" } }),
    prisma.rfq.count({ where: { status: { in: ["MANUAL_SOURCING", "MATCHING"] } } }),
    prisma.sellerProfile.count({ where: { verificationStatus: "PENDING_REVIEW" } }),
    prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.payment.count({ where: { status: { in: ["FAILED", "DISPUTED"] }, createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } } }),
    prisma.backgroundJob.count({ where: { status: "DEAD" } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.invoice.count({ where: { status: "ISSUED" } }),
  ]);
  return { review, clarification, manual, verification, claims, failedPayments, deadJobs, reports, invoiceRequests };
}

export async function demandByPatchType(range: Range) {
  const rows = await prisma.rfq.groupBy({ by: ["patchType"], where: { isDemo: false, createdAt: { gte: range.from, lte: range.to }, status: { not: "DRAFT" } }, _count: true });
  return rows.map((r) => ({ patchType: r.patchType, count: r._count })).sort((a, b) => b.count - a.count);
}

export async function fastestSellers(limit = 5) {
  return prisma.sellerProfile.findMany({ where: { isDemo: false, avgResponseMinutes: { not: null } }, orderBy: { avgResponseMinutes: "asc" }, take: limit, select: { tradingName: true, legalName: true, avgResponseMinutes: true, quotesSubmitted: true } });
}
