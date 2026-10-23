import "server-only";
import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { startUnlock, creditWallet } from "@/lib/domain/unlock";
import { saveQuote } from "@/lib/domain/quotes";
import { postMessage } from "@/lib/domain/messages";
import { nudgeUnclaimedOpportunities } from "@/lib/domain/matching";
import { createDemoRfq, createDemoSeller, rnd } from "./factory";
import { DEMO_ACCOUNTS, UNIT_PRICE, type DemoPatchType } from "./catalog";

/**
 * DEMO MARKETPLACE SIMULATOR — runs only when DEMO_MODE=true, against a demo database.
 *
 * Serverless-friendly: there is no always-on worker. Every live-feed poll calls maybeSimulate(),
 * which atomically claims at most one "tick" per TICK_MS across all instances. A tick performs one
 * marketplace action through the real domain services (new buyer request, manufacturer
 * application, a manufacturer claiming a request, a quotation), so the admin, seller and buyer
 * screens all react exactly as they would to real activity. Everything it creates is isDemo and
 * simulated=true, labelled as a demo simulation in the UI, and pruned after RETAIN_MS.
 */
const TICK_MS = 4_000;
const RETAIN_MS = 6 * 3_600_000;
const DAILY_RFQ_CAP = 900;

async function claimTick(): Promise<boolean> {
  await prisma.platformSetting.upsert({ where: { key: "demo.simTick" }, create: { key: "demo.simTick", value: { at: new Date(0).toISOString() } }, update: {} });
  const n = await prisma.$executeRaw`
    UPDATE "PlatformSetting" SET "value" = jsonb_build_object('at', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')), "updatedAt" = now()
    WHERE "key" = 'demo.simTick' AND ("value"->>'at')::timestamptz < now() - make_interval(secs => ${TICK_MS / 1000})`;
  return n > 0;
}

async function demoAdminId() {
  return (await prisma.user.findUnique({ where: { email: DEMO_ACCOUNTS.admin.email }, select: { id: true } }))?.id ?? null;
}

async function passwordHash() {
  return (await prisma.user.findUnique({ where: { email: DEMO_ACCOUNTS.seller.email }, select: { passwordHash: true } }))?.passwordHash ?? "!disabled";
}

async function newBuyerRequest() {
  const today = await prisma.rfq.count({ where: { simulated: true, createdAt: { gte: new Date(Date.now() - 86_400_000) } } });
  if (today >= DAILY_RFQ_CAP) return;
  const landing = rnd.chance(0.3);
  await createDemoRfq({ adminId: null, simulated: true, leadSource: landing ? "landing:custom-patch-quote" : "marketplace", shared: !landing && rnd.chance(0.35), stopAt: rnd.chance(0.12) ? "review" : undefined });
}

async function newSellerApplication() {
  await createDemoSeller({ status: "PENDING_REVIEW", passwordHash: await passwordHash(), simulated: true, createdAt: new Date() });
}

/** A demo manufacturer (never the presenter's seller account) claims an open request with credits. */
async function sellerClaimsRequest() {
  const opp = await prisma.opportunity.findFirst({
    where: { status: "AVAILABLE", isDemo: true, publishedAt: { lte: new Date(Date.now() - 25_000) } },
    orderBy: { publishedAt: "asc" },
    include: { rfq: { include: { matches: { where: { status: "NOTIFIED", eligible: true }, include: { seller: { include: { org: { include: { members: { include: { user: true } } } } } } } } } } },
  });
  if (!opp) return;
  const candidates = opp.rfq.matches.map((m) => m.seller).filter((s) => s.email !== DEMO_ACCOUNTS.seller.email && s.availability === "ACTIVE");
  const seller = candidates.length ? rnd.pick(candidates) : null;
  const owner = seller?.org.members[0]?.user;
  if (!seller || !owner) return;
  const wallet = await prisma.wallet.findUnique({ where: { orgId: seller.orgId } });
  if ((wallet?.balanceMinor ?? 0) < opp.priceMinor) {
    await prisma.$transaction((tx) => creditWallet(tx, { orgId: seller.orgId, amountMinor: 20_000, currency: "USD", type: "ADJUSTMENT", memo: "Demo credits (fictional)", idempotencyKey: `demo-credit:${seller.orgId}:${Date.now()}` }));
  }
  await startUnlock({ sellerId: seller.id, orgId: seller.orgId, userId: owner.id, userEmail: owner.email, rfqId: opp.rfqId, method: "CREDITS" });
}

/** A manufacturer that unlocked a request sends an itemised quotation. */
async function sellerSendsQuote() {
  const unlock = await prisma.rfqUnlock.findFirst({
    where: { status: "ACTIVE", isDemo: true, createdAt: { lte: new Date(Date.now() - 15_000) }, seller: { email: { not: DEMO_ACCOUNTS.seller.email } }, rfq: { status: { in: ["SELLER_NOTIFIED", "QUOTES_RECEIVED"] }, quotes: { none: {} } } },
    orderBy: { createdAt: "asc" },
    include: { rfq: { include: { spec: true } }, seller: { include: { org: { include: { members: { include: { user: true } } } } } } },
  });
  if (!unlock?.rfq.spec) return;
  const owner = unlock.seller.org.members[0]?.user;
  if (!owner) return;
  const type = (unlock.rfq.patchType === "NOT_SURE" ? "EMBROIDERED" : unlock.rfq.patchType) as DemoPatchType;
  const [lo, hi] = UNIT_PRICE[type];
  const qty = unlock.rfq.spec.quantity;
  const unit = Math.round((lo + Math.random() * (hi - lo)) * (qty >= 1000 ? 0.8 : 1) * 100) / 100;
  await saveQuote({
    sellerId: unlock.sellerId, userId: owner.id, rfqId: unlock.rfqId, submit: true,
    input: {
      quantity: qty, unitPrice: unit, setupFee: rnd.pick([0, 25, 35, 50]), sampleFee: rnd.pick([0, 0, 15, 25]), toolingFee: type === "PVC" ? rnd.pick([40, 60, 80]) : 0, artworkFee: 0,
      shipping: rnd.pick([35, 45, 60, 85]), currency: "USD", productionDays: rnd.int(7, 16), deliveryEstimate: rnd.pick(["4–6 business days DHL Express", "5–7 business days by courier", "3–5 business days FedEx"]),
      samplePolicy: rnd.pick(["Free digital proof; physical sample $15", "Free digital mock-up within 24h", "Physical sample credited against the order"]),
      paymentTerms: rnd.pick(["50% deposit, 50% before shipping", "100% after proof approval", "30% deposit, balance before dispatch"]),
      revisionPolicy: "Unlimited proof revisions before production", notes: "Thanks for the request! Happy to match your thread colours exactly.", validDays: 30,
    },
  });
  if (unlock.rfq.buyerUserId) return;
  // Guest buyers can't reply here; the seller's intro message shows the conversation flow.
  await postMessage({ rfqId: unlock.rfqId, sellerId: unlock.sellerId, side: "SELLER", userId: owner.id, body: "Hi! We've sent an itemised quote. We can also send a free digital proof today." }).catch(() => {});
}

/** Deletes simulated rows older than RETAIN_MS so a long-running demo stays small. */
async function prune() {
  const cutoff = new Date(Date.now() - RETAIN_MS);
  const old = await prisma.rfq.findMany({ where: { simulated: true, createdAt: { lt: cutoff } }, select: { id: true }, take: 40 });
  if (old.length) {
    const rfqIds = old.map((r) => r.id);
    await prisma.$transaction(async (tx) => {
      const unlocks = await tx.rfqUnlock.findMany({ where: { rfqId: { in: rfqIds } }, select: { id: true, paymentId: true } });
      const unlockIds = unlocks.map((u) => u.id);
      await tx.walletLedgerEntry.deleteMany({ where: { unlockId: { in: unlockIds } } });
      await tx.refund.deleteMany({ where: { unlockId: { in: unlockIds } } });
      await tx.dispute.deleteMany({ where: { unlockId: { in: unlockIds } } });
      await tx.dataDisclosureEvent.deleteMany({ where: { rfqId: { in: rfqIds } } });
      await tx.rfq.updateMany({ where: { id: { in: rfqIds } }, data: { selectedQuoteId: null } });
      await tx.rfq.deleteMany({ where: { id: { in: rfqIds } } });
      await tx.activityEvent.deleteMany({ where: { rfqId: { in: rfqIds } } });
    });
  }
  await prisma.activityEvent.deleteMany({ where: { simulated: true, createdAt: { lt: cutoff } } });
  await prisma.notification.deleteMany({ where: { createdAt: { lt: cutoff }, user: { isDemo: true }, readAt: { not: null } } });
}

const ACTIONS = { request: 46, quote: 20, claim: 16, application: 12, nudge: 6 } as const;

/** Called by live-feed requests. Never throws; returns quickly when another instance owns the tick. */
export async function maybeSimulate() {
  if (!isDemoMode()) return;
  try {
    if (!(await claimTick())) return;
    const action = rnd.weighted<keyof typeof ACTIONS>({ ...ACTIONS });
    if (action === "request") await newBuyerRequest();
    else if (action === "quote") await sellerSendsQuote();
    else if (action === "claim") await sellerClaimsRequest();
    else if (action === "application") await newSellerApplication();
    else await nudgeUnclaimedOpportunities({ olderThanMs: 90_000, limit: 2, demo: true });
    if (rnd.chance(0.05)) await prune();
  } catch (e) {
    console.warn("[demo-sim] tick failed:", (e as Error).message);
  }
}

export { demoAdminId };
