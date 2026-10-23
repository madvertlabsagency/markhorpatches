import "server-only";
import { prisma } from "@/lib/db";
import { COUNTRIES, patchTypeName } from "@/lib/catalog";

const countryName = (c: string | null | undefined) => (c ? (COUNTRIES.find((x) => x.code === c)?.name ?? c) : null);
import { formatMoney } from "@/lib/money";
import type { ActivityKind, Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Anonymised marketplace activity for live feeds (homepage ticker, /live board, admin and
 * seller dashboards). Events carry patch type, quantity, region and an estimated order value —
 * never buyer names, companies or contact details.
 */

/** Typical unit price ranges (USD cents) used only to estimate order size when no budget is given. */
const TYPICAL_UNIT_MINOR: Record<string, number> = { EMBROIDERED: 110, PVC: 140, CHENILLE: 260, WOVEN: 95, SUBLIMATED: 90, LEATHER: 210, PRINTED: 70, NOT_SURE: 110 };

/** Estimated order value: the buyer's budget, else target unit × quantity, else a typical-price estimate. */
export function estimateOrderValueMinor(patchType: string, quantity: number, budgetTotalMinor?: number | null, targetUnitMinor?: number | null) {
  if (budgetTotalMinor && budgetTotalMinor > 0) return budgetTotalMinor;
  if (targetUnitMinor && targetUnitMinor > 0) return targetUnitMinor * quantity;
  const unit = TYPICAL_UNIT_MINOR[patchType] ?? 110;
  const discount = quantity >= 5000 ? 0.55 : quantity >= 1000 ? 0.7 : quantity >= 300 ? 0.85 : 1;
  return Math.round(unit * discount * quantity);
}

export async function recordActivity(
  data: { kind: ActivityKind; title: string; detail?: string; rfqId?: string; sellerId?: string; patchType?: string; quantity?: number; valueMinor?: number; region?: string; public?: boolean; isDemo?: boolean; simulated?: boolean },
  tx?: Tx,
) {
  try {
    await (tx ?? prisma).activityEvent.create({ data });
  } catch (e) {
    // Activity is informational; never fail a business transaction because of it.
    if (tx) throw e;
    console.error("[activity] record failed", e);
  }
}

async function rfqFacts(rfqId: string) {
  const rfq = await prisma.rfq.findUnique({ where: { id: rfqId }, include: { spec: true } });
  if (!rfq?.spec) return null;
  const s = rfq.spec;
  const value = estimateOrderValueMinor(rfq.patchType, s.quantity, s.budgetTotalMinor, s.targetUnitMinor);
  const region = [s.destinationState, s.destinationCountry].filter(Boolean).join(", ");
  return { rfq, spec: s, value, region };
}

export async function recordRfqPosted(rfqId: string) {
  const f = await rfqFacts(rfqId);
  if (!f) return;
  await recordActivity({
    kind: "RFQ_POSTED", rfqId, title: `New request · ${f.spec.quantity.toLocaleString("en-US")} × ${patchTypeName(f.rfq.patchType)}`,
    detail: `${f.region || "United States"}${f.spec.rush ? " · rush" : ""} · est. ${formatMoney(f.value, "USD", { compact: true })}`,
    patchType: f.rfq.patchType, quantity: f.spec.quantity, valueMinor: f.value, region: f.region, isDemo: f.rfq.isDemo, simulated: f.rfq.simulated,
  });
}

export async function recordRfqEvent(kind: "RFQ_UNLOCKED" | "QUOTE_SENT" | "SELLER_SELECTED" | "PREVIEW_VIEWED" | "OFFER_NUDGE", rfqId: string, sellerId: string | null, extra: { valueMinor?: number; public?: boolean } = {}) {
  const f = await rfqFacts(rfqId);
  if (!f) return;
  const seller = sellerId ? await prisma.sellerProfile.findUnique({ where: { id: sellerId }, select: { city: true, country: true, tradingName: true, legalName: true, simulated: true } }) : null;
  const where = seller ? [seller.city, countryName(seller.country)].filter(Boolean).join(", ") : "";
  const what = `${f.spec.quantity.toLocaleString("en-US")} × ${patchTypeName(f.rfq.patchType)}`;
  const titles = {
    RFQ_UNLOCKED: `Request claimed · ${f.rfq.publicRef}`,
    QUOTE_SENT: `Quote sent · ${f.rfq.publicRef}`,
    SELLER_SELECTED: `Buyer selected a manufacturer · ${f.rfq.publicRef}`,
    PREVIEW_VIEWED: `${seller?.tradingName ?? seller?.legalName ?? "A manufacturer"} viewed ${f.rfq.publicRef}`,
    OFFER_NUDGE: `No offers yet · ${f.rfq.publicRef}`,
  } as const;
  const details = {
    RFQ_UNLOCKED: `${what} · by a verified manufacturer${where ? ` in ${where}` : ""}`,
    QUOTE_SENT: `${what}${extra.valueMinor ? ` · quoted ${formatMoney(extra.valueMinor, "USD", { compact: true })}` : ""}${where ? ` · from ${where}` : ""}`,
    SELLER_SELECTED: `${what}${where ? ` · manufacturer in ${where}` : ""}`,
    PREVIEW_VIEWED: `${what} · anonymised preview`,
    OFFER_NUDGE: `${what} · matched manufacturers reminded`,
  } as const;
  await recordActivity({
    kind, rfqId, sellerId: sellerId ?? undefined, title: titles[kind], detail: details[kind], patchType: f.rfq.patchType, quantity: f.spec.quantity,
    valueMinor: extra.valueMinor ?? f.value, region: f.region, public: extra.public ?? kind !== "PREVIEW_VIEWED", isDemo: f.rfq.isDemo, simulated: f.rfq.simulated || !!seller?.simulated,
  });
}

export async function recordSellerEvent(kind: "SELLER_APPLIED" | "SELLER_VERIFIED", sellerId: string) {
  const s = await prisma.sellerProfile.findUnique({ where: { id: sellerId }, include: { capabilities: { select: { patchType: true } } } });
  if (!s) return;
  const where = [s.city, countryName(s.country)].filter(Boolean).join(", ");
  const types = s.capabilities.slice(0, 3).map((c) => patchTypeName(c.patchType).replace(" patches", "")).join(", ");
  await recordActivity({
    kind, sellerId, title: kind === "SELLER_APPLIED" ? `Manufacturer applied · ${where}` : `Manufacturer verified · ${where}`,
    detail: [s.yearsOperating ? `${s.yearsOperating} yrs experience` : null, types || null].filter(Boolean).join(" · "),
    region: where, isDemo: s.isDemo, simulated: s.simulated,
  });
}

export interface FeedEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string | null;
  patchType: string | null;
  quantity: number | null;
  valueMinor: number | null;
  region: string | null;
  createdAt: string;
}

export async function recentActivity(opts: { demo: boolean; includePrivate?: boolean; after?: Date; limit?: number; minValueMinor?: number }) {
  const rows = await prisma.activityEvent.findMany({
    where: {
      isDemo: opts.demo,
      ...(opts.includePrivate ? {} : { public: true }),
      ...(opts.after ? { createdAt: { gt: opts.after } } : {}),
      ...(opts.minValueMinor ? { OR: [{ valueMinor: { gte: opts.minValueMinor } }, { valueMinor: null }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(opts.limit ?? 30, 100),
  });
  return rows.map<FeedEvent>((r) => ({ id: r.id, kind: r.kind, title: r.title, detail: r.detail, patchType: r.patchType, quantity: r.quantity, valueMinor: r.valueMinor, region: r.region, createdAt: r.createdAt.toISOString() }));
}

export async function marketplaceStats(demo: boolean) {
  const since = new Date(Date.now() - 86_400_000);
  const [rfqs24h, quotes24h, unlocks24h, verifiedSellers, openOpportunities, applications24h] = await Promise.all([
    prisma.activityEvent.count({ where: { isDemo: demo, kind: "RFQ_POSTED", createdAt: { gte: since } } }),
    prisma.activityEvent.count({ where: { isDemo: demo, kind: "QUOTE_SENT", createdAt: { gte: since } } }),
    prisma.activityEvent.count({ where: { isDemo: demo, kind: "RFQ_UNLOCKED", createdAt: { gte: since } } }),
    prisma.sellerProfile.count({ where: { isDemo: demo, verificationStatus: "VERIFIED" } }),
    prisma.opportunity.count({ where: { status: "AVAILABLE", rfq: { isDemo: demo } } }),
    prisma.activityEvent.count({ where: { isDemo: demo, kind: "SELLER_APPLIED", createdAt: { gte: since } } }),
  ]);
  return { rfqs24h, quotes24h, unlocks24h, verifiedSellers, openOpportunities, applications24h };
}
