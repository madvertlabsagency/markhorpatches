import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { startUnlock, creditWallet } from "@/lib/domain/unlock";
import { saveQuote, buyerQuoteAction } from "@/lib/domain/quotes";
import { postMessage } from "@/lib/domain/messages";
import { nudgeUnclaimedOpportunities, publishOpportunity } from "@/lib/domain/matching";
import { fileDispute, decideDispute } from "@/lib/domain/finance";
import { buyerQuoteReminder, closeRfq } from "@/lib/domain/engagement";
import { updateProjectStatus, PROJECT_STEPS } from "@/lib/domain/projects";
import { setRfqStatus } from "@/lib/domain/rfq";
import { createDemoRfq, createDemoSeller, demoArtworkPool, rnd } from "./factory";
import { DEMO_ACCOUNTS, UNIT_PRICE, type DemoPatchType } from "./catalog";
import { assertDemo, demoSimSettings } from "./settings";

/**
 * DEMO MARKETPLACE ENGINE — only when DEMO_MODE=true (assertDemo on every mutation).
 *
 * Every action runs through the real domain services (pipeline, unlocks, quotes, messaging,
 * claims, project tracking) against fictional, isDemo records, so the buyer/manufacturer/admin
 * screens react exactly as they would to real activity. Nothing here sends email (demo mode and
 * synthetic example.com addresses are suppressed) or touches a real payment provider.
 */
export type DemoResult = { ok: boolean; message: string; link?: string };

export type SellerCtx = { id: string; orgId: string; userId: string; email: string; name: string };

async function sellerCtx(where: object): Promise<SellerCtx | null> {
  const s = await prisma.sellerProfile.findFirst({ where: { isDemo: true, verificationStatus: "VERIFIED", ...where }, include: { org: { include: { members: { include: { user: true } } } } } });
  const u = s?.org.members[0]?.user;
  return s && u ? { id: s.id, orgId: s.orgId, userId: u.id, email: u.email, name: s.tradingName ?? s.legalName } : null;
}
export const presenterSeller = () => sellerCtx({ email: DEMO_ACCOUNTS.seller.email });
async function adminId() {
  return (await prisma.user.findUnique({ where: { email: DEMO_ACCOUNTS.admin.email }, select: { id: true } }))?.id ?? null;
}
async function buyerCtx(email: string) {
  const u = await prisma.user.findUnique({ where: { email }, include: { memberships: { include: { org: true } } } });
  const org = u?.memberships.find((m) => m.org.type === "BUYER")?.org;
  return u && org ? { userId: u.id, orgId: org.id, name: u.name ?? "Buyer", email: u.email, company: org.name } : null;
}
export const presenterBuyer = () => buyerCtx(DEMO_ACCOUNTS.buyer.email);
async function randomPersona() {
  const users = await prisma.user.findMany({ where: { isDemo: true, email: { not: DEMO_ACCOUNTS.buyer.email }, memberships: { some: { org: { type: "BUYER" } } } }, select: { email: true } });
  return users.length ? buyerCtx(rnd.pick(users).email) : null;
}

async function ensureCredits(s: SellerCtx, needMinor: number) {
  const w = await prisma.wallet.findUnique({ where: { orgId: s.orgId } });
  if ((w?.balanceMinor ?? 0) >= needMinor) return;
  await prisma.$transaction((tx) => creditWallet(tx, { orgId: s.orgId, amountMinor: 10_000, currency: "USD", type: "ADJUSTMENT", memo: "Simulated demo credits", idempotencyKey: `demo-credit:${s.orgId}:${randomUUID()}` }));
}

async function unlockAs(s: SellerCtx, rfqId: string) {
  const opp = await prisma.opportunity.findUniqueOrThrow({ where: { rfqId } });
  await ensureCredits(s, opp.priceMinor);
  return startUnlock({ sellerId: s.id, orgId: s.orgId, userId: s.userId, userEmail: s.email, rfqId, method: "CREDITS" });
}

export async function quoteAs(s: SellerCtx, rfqId: string, discount = 1) {
  const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: rfqId }, include: { spec: true } });
  const type = (rfq.patchType === "NOT_SURE" ? "EMBROIDERED" : rfq.patchType) as DemoPatchType;
  const [lo, hi] = UNIT_PRICE[type];
  const qty = rfq.spec!.quantity;
  return saveQuote({
    sellerId: s.id, userId: s.userId, rfqId, submit: true,
    input: {
      quantity: qty, unitPrice: Math.round((lo + Math.random() * (hi - lo)) * (qty >= 1000 ? 0.8 : 1) * discount * 100) / 100, setupFee: rnd.pick([0, 25, 35, 50]), sampleFee: rnd.pick([0, 15, 25]),
      toolingFee: type === "PVC" ? rnd.pick([40, 60, 80]) : 0, artworkFee: 0, shipping: rnd.pick([35, 45, 60, 85]), currency: "USD", productionDays: rnd.int(7, 16),
      deliveryEstimate: rnd.pick(["4–6 business days DHL Express", "5–7 business days by courier", "3–5 business days FedEx"]), samplePolicy: rnd.pick(["Free digital proof; physical sample $15", "Free digital mock-up within 24h"]),
      paymentTerms: rnd.pick(["50% deposit, 50% before shipping", "100% after proof approval"]), revisionPolicy: "Unlimited proof revisions before production",
      includedBacking: rnd.pick(["Iron-on", "Sew-on", "Hook & loop (both sides)", "Adhesive"]), inclusions: "Digital proof, merrowed border, individual packing", exclusions: "US import duties (if any)",
      notes: "Simulated demo quotation — thanks for the request! Happy to match your thread colours exactly.", validDays: 30,
    },
  });
}

/** A request that stops before publication, then publishes with the chosen sellers approved first. */
async function scenarioRfq(opts: { buyer: NonNullable<Awaited<ReturnType<typeof buyerCtx>>>; prefer: SellerCtx[]; shared?: boolean; privacy?: "PLATFORM_MESSAGING_ONLY" | "BUYER_SELECTED" | "FULL_CONTACT"; patchType?: DemoPatchType; quantity?: number }) {
  const admin = await adminId();
  const rfq = await createDemoRfq({ adminId: admin, buyer: opts.buyer, simulated: true, stopAt: "matching", shared: opts.shared, privacy: opts.privacy ?? "BUYER_SELECTED", intent: "READY", buyingStage: "READY_7_DAYS", patchType: opts.patchType, quantity: opts.quantity });
  for (const s of opts.prefer) await prisma.rfqMatch.updateMany({ where: { rfqId: rfq.id, sellerId: s.id, eligible: true }, data: { status: "APPROVED" } });
  const fresh = await prisma.rfq.findUniqueOrThrow({ where: { id: rfq.id } });
  await publishOpportunity(rfq.id, admin, opts.shared && fresh.maxRecipients > 1 ? { distributionMode: "LIMITED_SHARED", maxUnlocks: 3 } : { distributionMode: "EXCLUSIVE" });
  return rfq;
}

async function verifiedOthers(n: number, exclude: string[]) {
  const ids = await prisma.sellerProfile.findMany({ where: { isDemo: true, verificationStatus: "VERIFIED", id: { notIn: exclude }, capabilities: { some: { patchType: "EMBROIDERED" } } }, select: { id: true }, take: 40 });
  const out: SellerCtx[] = [];
  for (const { id } of ids.sort(() => Math.random() - 0.5)) {
    const c = await sellerCtx({ id });
    if (c) out.push(c);
    if (out.length >= n) break;
  }
  return out;
}

const BUYER_LINES = [
  "Thanks! Could you confirm the thread colours will match our brand navy?",
  "Looks good. Can you do 3.5\" instead of 3\" at the same price?",
  "What's the earliest ship date if we approve the proof today?",
  "Could you send a digital proof before we commit?",
  "Is iron-on or sew-on better for polyester jerseys?",
];
const SELLER_LINES = [
  "Yes, we can. Could you confirm the dimensions and required delivery date?",
  "Thank you. I'll prepare a quotation with production and shipping estimates.",
  "We can ship within 12 days of proof approval. Digital proof attached in the next message.",
  "Happy to adjust — I'll send a revised quote shortly.",
];

// ───────────────────────── Control-center actions ─────────────────────────

export async function genBuyerRequest(o: { simulated?: boolean } = {}): Promise<DemoResult> {
  assertDemo();
  const buyer = await randomPersona();
  const rfq = await createDemoRfq({ adminId: null, buyer: buyer ?? undefined, simulated: o.simulated ?? true, shared: rnd.chance(0.35), leadSource: rnd.chance(0.25) ? "landing:custom-patch-quote" : "marketplace", stopAt: rnd.chance(0.12) ? "review" : undefined });
  return { ok: true, message: `New simulated RFQ ${rfq.publicRef} from ${buyer?.company ?? "a guest buyer"}.`, link: `/admin/rfqs` };
}

export async function genApplication(): Promise<DemoResult> {
  assertDemo();
  const hash = (await prisma.user.findUnique({ where: { email: DEMO_ACCOUNTS.seller.email }, select: { passwordHash: true } }))?.passwordHash ?? "!disabled";
  const { seller } = await createDemoSeller({ status: "PENDING_REVIEW", passwordHash: hash, simulated: true, createdAt: new Date() });
  return { ok: true, message: `New simulated manufacturer application: ${seller.tradingName} (${seller.city}).`, link: `/admin/seller-verification/${seller.id}` };
}

export async function simulateSellerUnlock(): Promise<DemoResult> {
  assertDemo();
  const opp = await prisma.opportunity.findFirst({
    where: { status: "AVAILABLE", isDemo: true },
    orderBy: { publishedAt: "asc" },
    include: { rfq: { include: { matches: { where: { status: { in: ["NOTIFIED", "APPROVED"] }, eligible: true }, select: { sellerId: true } } } } },
  });
  if (!opp) return { ok: false, message: "No open demo opportunities — generate a request first." };
  const presenter = await presenterSeller();
  const candidates = opp.rfq.matches.map((m) => m.sellerId).filter((id) => id !== presenter?.id);
  if (!candidates.length) return { ok: false, message: "No eligible demo manufacturer for the oldest open request." };
  const s = await sellerCtx({ id: rnd.pick(candidates) });
  if (!s) return { ok: false, message: "Demo manufacturer not found." };
  await unlockAs(s, opp.rfqId);
  return { ok: true, message: `${s.name} unlocked ${opp.rfq.publicRef} with simulated credits.`, link: `/admin/unlocks` };
}

export async function simulateQuote(): Promise<DemoResult> {
  assertDemo();
  const presenter = await presenterSeller();
  let unlock = await prisma.rfqUnlock.findFirst({ where: { status: "ACTIVE", isDemo: true, sellerId: { not: presenter?.id }, rfq: { status: { in: ["SELLER_NOTIFIED", "QUOTES_RECEIVED"] } }, NOT: { rfq: { quotes: { some: { sellerId: { not: undefined } } } } } }, orderBy: { createdAt: "asc" } });
  unlock ??= await prisma.rfqUnlock.findFirst({ where: { status: "ACTIVE", isDemo: true, sellerId: { not: presenter?.id }, rfq: { status: { in: ["SELLER_NOTIFIED", "QUOTES_RECEIVED"] } } }, orderBy: { createdAt: "asc" } });
  if (!unlock) {
    const r = await simulateSellerUnlock();
    if (!r.ok) return r;
    return simulateQuote();
  }
  const s = await sellerCtx({ id: unlock.sellerId });
  if (!s) return { ok: false, message: "Demo manufacturer not found." };
  const existing = await prisma.quote.findUnique({ where: { rfqId_sellerId: { rfqId: unlock.rfqId, sellerId: s.id } } });
  if (existing && existing.status !== "DRAFT") return { ok: false, message: "That manufacturer already quoted; try again." };
  const q = await quoteAs(s, unlock.rfqId);
  await postMessage({ rfqId: unlock.rfqId, sellerId: s.id, side: "SELLER", userId: s.userId, kind: "QUOTE", meta: { quoteId: q.id }, body: "I've sent an itemised quotation — simulated demo pricing." }).catch(() => {});
  return { ok: true, message: `${s.name} submitted a simulated quotation.`, link: `/admin/quotes` };
}

export async function simulateBuyerReply(): Promise<DemoResult> {
  assertDemo();
  const conv = await prisma.conversation.findFirst({ where: { rfq: { isDemo: true, buyerUserId: { not: null }, buyerUser: { email: { not: DEMO_ACCOUNTS.buyer.email } } }, messages: { some: { side: "SELLER" } } }, orderBy: { lastMessageAt: "desc" }, include: { rfq: true } });
  if (!conv?.rfq.buyerUserId) return { ok: false, message: "No demo conversation waiting for a buyer reply yet." };
  await postMessage({ rfqId: conv.rfqId, sellerId: conv.sellerId, side: "BUYER", userId: conv.rfq.buyerUserId, body: rnd.pick(BUYER_LINES) });
  return { ok: true, message: `Demo buyer replied on ${conv.rfq.publicRef}.`, link: `/admin/messages` };
}

async function simulateSellerMessage() {
  const conv = await prisma.conversation.findFirst({ where: { rfq: { isDemo: true }, seller: { email: { not: DEMO_ACCOUNTS.seller.email } }, messages: { some: { side: "BUYER" } } }, orderBy: { lastMessageAt: "desc" }, include: { seller: { include: { org: { include: { members: true } } } } } });
  const userId = conv?.seller.org.members[0]?.userId;
  if (!conv || !userId) return;
  await postMessage({ rfqId: conv.rfqId, sellerId: conv.sellerId, side: "SELLER", userId, body: rnd.pick(SELLER_LINES) });
}

/** Buyer selects a manufacturer, or an existing simulated project moves one step forward. */
export async function simulateOrder(): Promise<DemoResult> {
  assertDemo();
  const project = await prisma.project.findFirst({ where: { isDemo: true, status: { notIn: ["DELIVERED", "CANCELLED"] }, rfq: { buyerUser: { email: { not: DEMO_ACCOUNTS.buyer.email } } } }, orderBy: { updatedAt: "asc" }, include: { rfq: true } });
  if (project && rnd.chance(0.6)) {
    const idx = PROJECT_STEPS.findIndex((s) => s.status === project.status);
    const next = PROJECT_STEPS[idx + 1];
    const buyerSide = next.status === "PROOF_APPROVED" || next.status === "DELIVERED";
    const s = await sellerCtx({ id: project.sellerId });
    const actorId = buyerSide ? project.rfq.buyerUserId : s?.userId;
    if (actorId) {
      await updateProjectStatus({ rfqId: project.rfqId, status: next.status, actorId, side: buyerSide ? "BUYER" : "SELLER", note: "Simulated project update" });
      return { ok: true, message: `Demo project ${project.rfq.publicRef} moved to “${next.label}”.`, link: `/admin/rfqs` };
    }
  }
  const quote = await prisma.quote.findFirst({ where: { isDemo: true, status: { in: ["SUBMITTED", "VIEWED", "REVISED"] }, rfq: { status: { in: ["SELLER_NOTIFIED", "QUOTES_RECEIVED"] }, buyerUserId: { not: null }, buyerUser: { email: { not: DEMO_ACCOUNTS.buyer.email } } } }, orderBy: { submittedAt: "asc" }, include: { rfq: true } });
  if (!quote?.rfq.buyerUserId) return { ok: false, message: "No simulated quotation ready for selection yet." };
  await buyerQuoteAction({ rfqId: quote.rfqId, quoteId: quote.id, userId: quote.rfq.buyerUserId, action: "SELECT" });
  return { ok: true, message: `Demo buyer selected a manufacturer for ${quote.rfq.publicRef}.`, link: `/admin/quotes` };
}

export async function simulateQualityClaim(): Promise<DemoResult> {
  assertDemo();
  const unlock = await prisma.rfqUnlock.findFirst({ where: { isDemo: true, status: "ACTIVE", method: { not: "COMPLIMENTARY" }, disputes: { none: {} }, createdAt: { gte: new Date(Date.now() - 6 * 86_400_000) } }, orderBy: { createdAt: "desc" } });
  if (!unlock) return { ok: false, message: "No recent demo purchase to claim against." };
  const s = await sellerCtx({ id: unlock.sellerId });
  if (!s) return { ok: false, message: "Demo manufacturer not found." };
  const d = await fileDispute({ sellerId: s.id, userId: s.userId, unlockId: unlock.id, reason: "INVALID_CONTACT", description: "Simulated claim: the buyer's phone number is unreachable and email bounced twice." });
  return { ok: true, message: `Simulated quality claim filed by ${s.name}. Review it as admin.`, link: `/admin/disputes/${d.id}` };
}

export async function simulateNoResponse(): Promise<DemoResult> {
  return runScenario("B");
}

export async function seedRfqs(n: number): Promise<DemoResult> {
  assertDemo();
  let made = 0;
  for (let i = 0; i < n; i++) {
    try {
      await genBuyerRequest({ simulated: false });
      made++;
    } catch (e) {
      console.warn("[demo] seed request failed:", (e as Error).message);
    }
  }
  return { ok: made > 0, message: `Added ${made} demo request(s).`, link: "/admin/rfqs" };
}

/** Removes everything the simulator and control-center buttons created (simulated=true), keeping the seeded baseline. */
export async function resetSimulation(): Promise<DemoResult> {
  assertDemo();
  const rfqIds = (await prisma.rfq.findMany({ where: { simulated: true }, select: { id: true } })).map((r) => r.id);
  await purgeRfqs(rfqIds);
  const sellers = await prisma.sellerProfile.findMany({ where: { simulated: true }, select: { orgId: true, org: { select: { members: { select: { userId: true } } } } } });
  for (const s of sellers) {
    await prisma.organization.delete({ where: { id: s.orgId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: s.org.members.map((m) => m.userId) }, isDemo: true } });
  }
  await prisma.activityEvent.deleteMany({ where: { simulated: true } });
  await prisma.platformSetting.deleteMany({ where: { key: { in: ["demo.simTick"] } } });
  return { ok: true, message: `Simulation reset: removed ${rfqIds.length} simulated request(s) and ${sellers.length} simulated application(s).` };
}

export async function purgeRfqs(rfqIds: string[]) {
  for (let i = 0; i < rfqIds.length; i += 50) {
    const ids = rfqIds.slice(i, i + 50);
    await prisma.$transaction(async (tx) => {
      const unlockIds = (await tx.rfqUnlock.findMany({ where: { rfqId: { in: ids } }, select: { id: true } })).map((u) => u.id);
      await tx.walletLedgerEntry.deleteMany({ where: { unlockId: { in: unlockIds } } });
      await tx.refund.deleteMany({ where: { unlockId: { in: unlockIds } } });
      await tx.dispute.deleteMany({ where: { unlockId: { in: unlockIds } } });
      await tx.dataDisclosureEvent.deleteMany({ where: { rfqId: { in: ids } } });
      await tx.rfq.updateMany({ where: { id: { in: ids } }, data: { selectedQuoteId: null } });
      await tx.rfq.deleteMany({ where: { id: { in: ids } } });
      await tx.activityEvent.deleteMany({ where: { rfqId: { in: ids } } });
    });
  }
}

// ───────────────────────── Scenarios A–F (repeatable) ─────────────────────────

export const SCENARIOS = {
  A: { title: "Successful buyer journey", steps: "RFQ → verification → intent → matching → unlock → quotation → chat → manufacturer selected" },
  B: { title: "Buyer does not respond", steps: "RFQ → unlock → quote → no response → two reminders → request expires" },
  C: { title: "Invalid RFQ claim", steps: "Unlock → invalid contact found → quality claim → admin review → demo credit" },
  D: { title: "Shared RFQ", steps: "Three manufacturers unlock → three quotes → buyer compares → selects one" },
  E: { title: "Exclusive RFQ", steps: "One manufacturer purchases → others can no longer unlock" },
  F: { title: "Artwork revision", steps: "Seller sends proof → buyer requests changes → updated proof → approved" },
} as const;
export type ScenarioKey = keyof typeof SCENARIOS;

export async function runScenario(key: ScenarioKey): Promise<DemoResult> {
  assertDemo();
  const buyer = await presenterBuyer();
  const seller = await presenterSeller();
  if (!buyer || !seller) return { ok: false, message: "Demo presenter accounts are missing — reseed the demo." };
  const admin = await adminId();
  switch (key) {
    case "A": {
      const rfq = await scenarioRfq({ buyer, prefer: [seller], privacy: "BUYER_SELECTED" });
      await unlockAs(seller, rfq.id);
      await postMessage({ rfqId: rfq.id, sellerId: seller.id, side: "SELLER", userId: seller.userId, body: "Hi Olivia, can you confirm the patch size and the delivery date you need?" });
      await postMessage({ rfqId: rfq.id, sellerId: seller.id, side: "BUYER", userId: buyer.userId, body: "3 inches wide, delivery within three weeks please." });
      const q = await quoteAs(seller, rfq.id);
      await postMessage({ rfqId: rfq.id, sellerId: seller.id, side: "SELLER", userId: seller.userId, kind: "QUOTE", meta: { quoteId: q.id }, body: "Thank you — I've sent a quotation with production and shipping estimates." });
      await buyerQuoteAction({ rfqId: rfq.id, quoteId: q.id, userId: buyer.userId, action: "VIEW" });
      await buyerQuoteAction({ rfqId: rfq.id, quoteId: q.id, userId: buyer.userId, action: "SELECT" });
      return { ok: true, message: `Scenario A complete on ${rfq.publicRef}: manufacturer selected and project started.`, link: `/buyer/rfqs/${rfq.id}` };
    }
    case "B": {
      const persona = (await randomPersona()) ?? buyer;
      const rfq = await scenarioRfq({ buyer: persona, prefer: [seller] });
      await unlockAs(seller, rfq.id);
      const q = await quoteAs(seller, rfq.id);
      await buyerQuoteReminder(q.id, 1);
      await buyerQuoteReminder(q.id, 2);
      await prisma.$transaction(async (tx) => {
        await setRfqStatus(tx, rfq.id, "EXPIRED", { actorId: admin, note: "Simulated: buyer did not respond", force: true });
        await tx.rfq.update({ where: { id: rfq.id }, data: { closedAt: new Date(), closeReason: "Buyer did not respond (simulated)", intentStatus: "EXPIRED" } });
      });
      return { ok: true, message: `Scenario B on ${rfq.publicRef}: quote sent, two reminders, no reply, request expired. Unlock fee is not refundable for non-response.`, link: `/seller/opportunities/${rfq.id}` };
    }
    case "C": {
      const rfq = await scenarioRfq({ buyer: (await randomPersona()) ?? buyer, prefer: [seller] });
      await unlockAs(seller, rfq.id);
      const unlock = await prisma.rfqUnlock.findFirstOrThrow({ where: { rfqId: rfq.id, sellerId: seller.id } });
      const d = await fileDispute({ sellerId: seller.id, userId: seller.userId, unlockId: unlock.id, reason: "INVALID_CONTACT", description: "Simulated: phone number disconnected and the email address bounced twice." });
      if (admin) await decideDispute({ adminId: admin, disputeId: d.id, decision: "CREDIT", note: "Simulated review: bounce evidence confirmed — demo credit issued." });
      return { ok: true, message: `Scenario C on ${rfq.publicRef}: claim reviewed and a demo credit added to the manufacturer's wallet.`, link: `/admin/disputes/${d.id}` };
    }
    case "D": {
      const others = await verifiedOthers(2, [seller.id]);
      const rfq = await scenarioRfq({ buyer, prefer: [seller, ...others], shared: true, privacy: "FULL_CONTACT", patchType: "EMBROIDERED" });
      const opp = await prisma.opportunity.findUniqueOrThrow({ where: { rfqId: rfq.id } });
      if (opp.maxUnlocks < 3) return { ok: false, message: "Shared RFQs need the limited-shared feature flag enabled." };
      const quotes = [];
      for (const [i, s] of [seller, ...others].entries()) {
        try {
          await unlockAs(s, rfq.id);
          quotes.push(await quoteAs(s, rfq.id, 1 - i * 0.07));
        } catch (e) {
          console.warn("[demo] shared unlock skipped:", (e as Error).message);
        }
      }
      const cheapest = quotes.sort((a, b) => a.totalMinor - b.totalMinor)[0];
      if (cheapest) await buyerQuoteAction({ rfqId: rfq.id, quoteId: cheapest.id, userId: buyer.userId, action: "SELECT" });
      return { ok: true, message: `Scenario D on ${rfq.publicRef}: ${quotes.length} manufacturers unlocked and quoted; the buyer selected one.`, link: `/buyer/rfqs/${rfq.id}` };
    }
    case "E": {
      const [other] = await verifiedOthers(1, [seller.id]);
      const rfq = await scenarioRfq({ buyer, prefer: [seller, ...(other ? [other] : [])] });
      await unlockAs(seller, rfq.id);
      let blocked = "no second manufacturer available";
      if (other) {
        try {
          await unlockAs(other, rfq.id);
          blocked = "unexpectedly succeeded";
        } catch (e) {
          blocked = (e as Error).message;
        }
      }
      return { ok: true, message: `Scenario E on ${rfq.publicRef}: ${seller.name} bought the exclusive request; second attempt → “${blocked}”.`, link: `/seller/opportunities/${rfq.id}` };
    }
    case "F": {
      const rfq = await scenarioRfq({ buyer, prefer: [seller] });
      await unlockAs(seller, rfq.id);
      const proof = async (label: string) => {
        const pool = await demoArtworkPool();
        const art = pool[rfq.patchType] ?? pool.EMBROIDERED;
        const a = await prisma.attachment.create({ data: { purpose: "MESSAGE_ATTACHMENT", status: "READY", storageKey: `${art.key}~${randomUUID()}`, previewKey: art.previewKey, teaserKey: art.teaserKey, originalFilename: `${label}.webp`, sanitizedFilename: `${label}.webp`, mimeType: "image/webp", extension: "webp", sizeBytes: art.size, sha256: art.sha, scanStatus: "UNSUPPORTED", uploaderUserId: seller.userId, ownerOrgId: seller.orgId } });
        return a.id;
      };
      await postMessage({ rfqId: rfq.id, sellerId: seller.id, side: "SELLER", userId: seller.userId, kind: "PROOF", body: "Here is your artwork proof v1 for review.", attachmentIds: [await proof("proof-v1")] });
      await postMessage({ rfqId: rfq.id, sellerId: seller.id, side: "BUYER", userId: buyer.userId, kind: "PROOF_CHANGES", body: "Thanks! Please make the border navy and the lettering 10% larger." });
      await postMessage({ rfqId: rfq.id, sellerId: seller.id, side: "SELLER", userId: seller.userId, kind: "PROOF", body: "Updated proof v2 — navy border, larger lettering.", attachmentIds: [await proof("proof-v2")] });
      await postMessage({ rfqId: rfq.id, sellerId: seller.id, side: "BUYER", userId: buyer.userId, kind: "PROOF_APPROVED", body: "Perfect — proof approved." });
      const conv = await prisma.conversation.findUniqueOrThrow({ where: { rfqId_sellerId: { rfqId: rfq.id, sellerId: seller.id } } });
      return { ok: true, message: `Scenario F on ${rfq.publicRef}: proof → changes → updated proof → approved.`, link: `/buyer/messages?c=${conv.id}` };
    }
  }
}

// ───────────────────────── Background simulation ─────────────────────────

const TICK_MS = 4_000;
const MAX_CATCHUP_MS = 15 * 60_000;

async function claimTick(): Promise<boolean> {
  await prisma.platformSetting.upsert({ where: { key: "demo.simTick" }, create: { key: "demo.simTick", value: { at: new Date(Date.now() - 60_000).toISOString(), carry: {} } }, update: {} });
  const n = await prisma.$executeRaw`
    UPDATE "PlatformSetting" SET "value" = jsonb_set("value", '{prev}', COALESCE("value"->'at', to_jsonb(now()::text))) || jsonb_build_object('at', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')), "updatedAt" = now()
    WHERE "key" = 'demo.simTick' AND ("value"->>'at')::timestamptz < now() - make_interval(secs => ${TICK_MS / 1000})`;
  return n > 0;
}

/**
 * One simulation step, rate-based with catch-up: the work due since the last step (from the
 * configured per-hour rates, capped at 15 minutes) runs now. Called by live-feed polls and by the
 * /api/cron/demo endpoint (schedule it every minute from any external cron so the marketplace keeps
 * moving with no browser open). Never throws.
 */
export async function maybeSimulate(): Promise<{ ran: string[] }> {
  if (!isDemoMode()) return { ran: [] };
  const ran: string[] = [];
  try {
    const settings = await demoSimSettings();
    if (!settings.enabled) return { ran };
    if (!(await claimTick())) return { ran };
    const row = await prisma.platformSetting.findUniqueOrThrow({ where: { key: "demo.simTick" } });
    const v = row.value as { at: string; prev?: string; carry?: Record<string, number> };
    const elapsedH = Math.min(Math.max(0, Date.parse(v.at) - Date.parse(v.prev ?? v.at)), MAX_CATCHUP_MS) / 3_600_000;
    const rates: Record<string, number> = { request: settings.rfqsPerHour, claim: settings.claimsPerHour, quote: settings.quotesPerHour, message: settings.messagesPerHour, order: settings.ordersPerHour, application: settings.applicationsPerHour };
    const carry = { ...(v.carry ?? {}) };
    const due: string[] = [];
    for (const [k, rate] of Object.entries(rates)) {
      carry[k] = Math.min(5, (carry[k] ?? 0) + rate * elapsedH);
      while (carry[k] >= 1) {
        due.push(k);
        carry[k] -= 1;
      }
    }
    await prisma.platformSetting.update({ where: { key: "demo.simTick" }, data: { value: { ...v, carry } } });
    for (const k of due.sort(() => Math.random() - 0.5).slice(0, 3)) {
      try {
        if (k === "request") await genBuyerRequest();
        else if (k === "claim") await simulateSellerUnlock();
        else if (k === "quote") await simulateQuote();
        else if (k === "message") await (rnd.chance(0.5) ? simulateBuyerReply() : simulateSellerMessage());
        else if (k === "order") await simulateOrder();
        else if (k === "application") await genApplication();
        ran.push(k);
      } catch (e) {
        console.warn(`[demo-sim] ${k} failed:`, (e as Error).message);
      }
    }
    if (rnd.chance(0.25)) await nudgeUnclaimedOpportunities({ olderThanMs: 120_000, limit: 2, demo: true });
    if (rnd.chance(0.03)) await pruneOld();
  } catch (e) {
    console.warn("[demo-sim] tick failed:", (e as Error).message);
  }
  return { ran };
}

/** Retention: simulated rows older than 6 hours are removed so a long-running demo stays small. */
async function pruneOld() {
  const cutoff = new Date(Date.now() - 6 * 3_600_000);
  const old = await prisma.rfq.findMany({ where: { simulated: true, createdAt: { lt: cutoff } }, select: { id: true }, take: 50 });
  await purgeRfqs(old.map((r) => r.id));
  await prisma.activityEvent.deleteMany({ where: { simulated: true, createdAt: { lt: cutoff } } });
  await prisma.notification.deleteMany({ where: { createdAt: { lt: cutoff }, user: { isDemo: true }, readAt: { not: null } } });
}

export { closeRfq };
