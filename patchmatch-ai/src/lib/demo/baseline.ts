import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/services/storage";
import { generatePreviews } from "@/lib/services/storage/previews";
import { sha256 } from "@/lib/crypto";
import { PATCH_TYPES } from "@/lib/catalog";
import { startUnlock } from "@/lib/domain/unlock";
import { buyerQuoteAction } from "@/lib/domain/quotes";
import { postMessage } from "@/lib/domain/messages";
import { fileDispute, decideDispute } from "@/lib/domain/finance";
import { createDemoRfq, createDemoSeller, rnd } from "./factory";
import { BUYER_PERSONAS, DEMO_ACCOUNTS, DEMO_PATCH_TYPES, type DemoPatchType } from "./catalog";
import { quoteAs, purgeRfqs } from "./engine";
import { assertDemo } from "./settings";

/**
 * DEMO BASELINE — the fictional marketplace a demo database starts from (and returns to on a full
 * reset): 3 presenter accounts, 20 manufacturers (Pakistan / US / India), 12 US buyer personas and
 * ~40 PM-DEMO-#### requests pushed through the real pipeline. Every record is isDemo=true.
 */
export const DEMO_BASELINE_VERSION = 2;
const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * 86_400_000 - h * 3_600_000);
type Log = (msg: string) => void;

/** Stores one shared sample image per patch type (brand-kit artwork from public/patches). */
export async function ensureDemoArtworkPool() {
  const existing = await prisma.platformSetting.findUnique({ where: { key: "demo.artworkPool" } });
  if (existing) return;
  const pool: Record<string, { key: string; previewKey: string; teaserKey: string; size: number; sha: string }> = {};
  for (const t of PATCH_TYPES) {
    const buf = await readFile(path.join(process.cwd(), "public", "patches", `${t.slug}.webp`));
    const p = await generatePreviews(buf);
    const key = `demo-shared/${t.code.toLowerCase()}/original.webp`;
    await storage().put(key, buf, "image/webp");
    await storage().put(`${key}.preview.webp`, p.preview, "image/webp");
    await storage().put(`${key}.teaser.webp`, p.teaser, "image/webp");
    pool[t.code] = { key, previewKey: `${key}.preview.webp`, teaserKey: `${key}.teaser.webp`, size: buf.length, sha: sha256(buf) };
  }
  pool.NOT_SURE = pool.EMBROIDERED;
  await prisma.platformSetting.create({ data: { key: "demo.artworkPool", value: pool } });
}

/** Deletes every isDemo record (requests, manufacturers, buyers, presenter accounts, demo analytics). Demo databases only. */
export async function wipeDemoData(log: Log = () => {}) {
  assertDemo();
  const rfqIds = (await prisma.rfq.findMany({ where: { isDemo: true }, select: { id: true } })).map((r) => r.id);
  await purgeRfqs(rfqIds);
  log(`[demo] removed ${rfqIds.length} demo requests`);
  const orgs = await prisma.organization.findMany({ where: { isDemo: true }, select: { id: true } });
  const orgIds = orgs.map((o) => o.id);
  const userIds = (await prisma.user.findMany({ where: { isDemo: true }, select: { id: true } })).map((u) => u.id);
  await prisma.$transaction(async (tx) => {
    const payIds = (await tx.payment.findMany({ where: { OR: [{ isDemo: true }, { orgId: { in: orgIds } }] }, select: { id: true } })).map((p) => p.id);
    await tx.walletLedgerEntry.deleteMany({ where: { paymentId: { in: payIds } } });
    await tx.invoice.deleteMany({ where: { OR: [{ isDemo: true }, { orgId: { in: orgIds } }] } });
    await tx.payment.deleteMany({ where: { id: { in: payIds } } });
    await tx.dispute.deleteMany({ where: { seller: { orgId: { in: orgIds } } } });
    await tx.invitation.deleteMany({ where: { OR: [{ orgId: { in: orgIds } }, { invitedById: { in: userIds } }] } });
    await tx.consentRecord.deleteMany({ where: { userId: { in: userIds } } });
    await tx.auditLog.updateMany({ where: { actorId: { in: userIds } }, data: { actorId: null } });
    await tx.message.updateMany({ where: { senderUserId: { in: userIds } }, data: { senderUserId: null } });
    await tx.organization.deleteMany({ where: { id: { in: orgIds } } });
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
    await tx.activityEvent.deleteMany({ where: { isDemo: true } });
    await tx.analyticsEvent.deleteMany({ where: { isDemo: true } });
    await tx.adSpendEntry.deleteMany({ where: { isDemo: true } });
    await tx.platformSetting.deleteMany({ where: { key: { in: ["demo.simTick", "demo.version"] } } });
  }, { timeout: 120_000 });
  log(`[demo] removed ${orgIds.length} demo organisations and ${userIds.length} demo users`);
}

export async function demoBaselineVersion(): Promise<number | null> {
  const row = await prisma.platformSetting.findUnique({ where: { key: "demo.version" } });
  return (row?.value as { version?: number } | null)?.version ?? null;
}

/** Creates the demo baseline. Expects an empty demo dataset (run wipeDemoData first). */
export async function seedDemoBaseline(opts: { passwordHash: string; log?: Log }) {
  assertDemo();
  const log = opts.log ?? (() => {});
  const t0 = Date.now();
  await ensureDemoArtworkPool();
  // Demo databases show the buyer-consented limited-shared workflow; production keeps it off.
  await prisma.featureFlag.updateMany({ where: { key: "limited_shared_rfqs" }, data: { enabled: true } });
  await prisma.matchingConfiguration.updateMany({ where: { active: true }, data: { maxNotified: 8 } });

  // ── Presenter accounts ──
  const { passwordHash } = opts;
  const admin = await prisma.user.create({ data: { email: DEMO_ACCOUNTS.admin.email, name: DEMO_ACCOUNTS.admin.name, passwordHash, platformRole: "SUPER_ADMIN", emailVerifiedAt: new Date(), isDemo: true } });
  const star = await createDemoSeller({ market: "PK", email: DEMO_ACCOUNTS.seller.email, name: DEMO_ACCOUNTS.seller.name, company: DEMO_ACCOUNTS.seller.company, passwordHash, allTypes: true, star: true, credits: 50_000, createdAt: daysAgo(420), reviewerId: admin.id });
  await prisma.sellerProfile.update({ where: { id: star.seller.id }, data: { city: "Sialkot", region: "Punjab", factoryLocation: "Small Industrial Estate, Sialkot" } });

  // ── 19 more manufacturers (20 total): verified, applications under review, info requested, suspended ──
  const statuses = [...Array(14).fill("VERIFIED"), "PENDING_REVIEW", "PENDING_REVIEW", "PENDING_REVIEW", "INFO_REQUIRED", "SUSPENDED"] as const;
  for (const status of statuses) {
    await createDemoSeller({ status, passwordHash, credits: status === "VERIFIED" ? 10_000 : 0, createdAt: status === "PENDING_REVIEW" ? daysAgo(rnd.int(0, 6), rnd.int(0, 20)) : undefined, reviewerId: admin.id });
  }
  log("[demo] 20 manufacturers");

  // ── 12 US buyer personas (the presenter buyer is the first) ──
  const buyers: { userId: string; orgId: string; name: string; email: string; company: string }[] = [];
  for (const [i, p] of BUYER_PERSONAS.entries()) {
    const email = i === 0 ? DEMO_ACCOUNTS.buyer.email : `${p.name.toLowerCase().replace(/[^a-z]+/g, ".")}.demo@example.com`;
    const user = await prisma.user.create({ data: { email, name: p.name, passwordHash, emailVerifiedAt: daysAgo(60), isDemo: true } });
    const org = await prisma.organization.create({ data: { type: "BUYER", name: p.company, slug: `demo-buyer-${i + 1}`, country: "US", isDemo: true, members: { create: { userId: user.id, role: "OWNER" } }, buyerProfile: { create: { companyName: p.company } } } });
    buyers.push({ userId: user.id, orgId: org.id, name: p.name, email, company: p.company });
  }

  // ── ~40 requests through the real pipeline ──
  let made = 0;
  let unlocked = 0;
  for (let i = 0; i < 40; i++) {
    const persona = BUYER_PERSONAS[i % BUYER_PERSONAS.length];
    const buyer = i < 6 ? buyers[0] : rnd.chance(0.7) ? buyers[i % buyers.length] : undefined;
    const created = i < 6 ? daysAgo(rnd.int(0, 10), rnd.int(1, 20)) : daysAgo(rnd.int(0, 20), rnd.int(0, 23));
    const stopAt = i % 13 === 5 ? "unverified" : i % 11 === 3 ? "review" : undefined;
    const landing = i >= 6 && rnd.chance(0.25);
    let rfq;
    try {
      rfq = await createDemoRfq({
        adminId: admin.id, buyer, patchType: (buyer ? persona.type : rnd.pick(DEMO_PATCH_TYPES)) as DemoPatchType, createdAt: created, stopAt,
        leadSource: landing ? "landing:custom-patch-quote" : "marketplace", shared: !landing && rnd.chance(0.3), noArtwork: rnd.chance(0.12),
      });
      made++;
    } catch (e) {
      log(`[demo] request ${i} skipped: ${(e as Error).message}`);
      continue;
    }
    if (stopAt) continue;
    const opp = await prisma.opportunity.findUnique({ where: { rfqId: rfq.id } });
    if (!opp || rnd.chance(0.4)) continue; // leave a healthy pool of open opportunities
    const notified = await prisma.rfqMatch.findMany({ where: { rfqId: rfq.id, status: "NOTIFIED" }, include: { seller: { include: { org: { include: { members: { include: { user: true } } } } } } } });
    const claimers = notified.map((m) => m.seller).filter((s) => (s.id === star.seller.id ? rnd.chance(0.35) : true)).slice(0, opp.maxUnlocks > 1 ? rnd.int(1, opp.maxUnlocks) : 1);
    for (const s of claimers) {
      const owner = s.org.members[0].user;
      const ctx = { id: s.id, orgId: s.orgId, userId: owner.id, email: owner.email, name: s.tradingName ?? s.legalName };
      try {
        await startUnlock({ sellerId: s.id, orgId: s.orgId, userId: owner.id, userEmail: owner.email, rfqId: rfq.id, method: "CREDITS" });
      } catch {
        continue;
      }
      unlocked++;
      if (rnd.chance(0.07)) {
        const u = await prisma.rfqUnlock.findFirstOrThrow({ where: { rfqId: rfq.id, sellerId: s.id } });
        const d = await fileDispute({ sellerId: s.id, userId: owner.id, unlockId: u.id, reason: "INVALID_CONTACT", description: "Simulated: phone number unreachable and email bounced twice." });
        if (rnd.chance(0.5)) await decideDispute({ adminId: admin.id, disputeId: d.id, decision: "CREDIT", note: "Simulated review: bounce verified — demo credit issued." });
        continue;
      }
      if (s.id === star.seller.id && rnd.chance(0.4)) continue; // presenter keeps unlocked requests waiting for a quote
      const q = await quoteAs(ctx, rfq.id).catch(() => null);
      if (!q) continue;
      await postMessage({ rfqId: rfq.id, sellerId: s.id, side: "SELLER", userId: owner.id, kind: "QUOTE", meta: { quoteId: q.id }, body: "Hi! Thanks for your request. We've sent an itemised quote — happy to adjust colours or size." });
      if (buyer) {
        await postMessage({ rfqId: rfq.id, sellerId: s.id, side: "BUYER", userId: buyer.userId, body: "Thanks! Could you confirm the thread colours will match our brand navy?" });
        if (rnd.chance(0.3)) await buyerQuoteAction({ rfqId: rfq.id, quoteId: q.id, userId: buyer.userId, action: "SELECT" }).catch(() => {});
      }
    }
  }

  // Align timestamps with each request's history so charts and feeds look natural.
  await prisma.$executeRaw`UPDATE "RfqUnlock" u SET "createdAt" = LEAST(now(), r."createdAt" + interval '3 hours' + (random() * interval '30 hours')) FROM "Rfq" r WHERE u."rfqId" = r.id AND r."isDemo"`;
  await prisma.$executeRaw`UPDATE "Quote" q SET "submittedAt" = LEAST(now(), u."createdAt" + interval '40 minutes' + (random() * interval '8 hours')), "createdAt" = LEAST(now(), u."createdAt" + interval '30 minutes') FROM "RfqUnlock" u WHERE u."rfqId" = q."rfqId" AND u."sellerId" = q."sellerId" AND q."isDemo"`;
  await prisma.$executeRaw`UPDATE "Opportunity" o SET "publishedAt" = LEAST(now(), r."createdAt" + interval '50 minutes') FROM "Rfq" r WHERE o."rfqId" = r.id AND r."isDemo"`;
  await prisma.$executeRaw`UPDATE "ActivityEvent" e SET "createdAt" = CASE e.kind
      WHEN 'RFQ_POSTED' THEN r."createdAt" + interval '5 minutes'
      WHEN 'RFQ_UNLOCKED' THEN COALESCE((SELECT min(u."createdAt") FROM "RfqUnlock" u WHERE u."rfqId" = r.id), e."createdAt")
      WHEN 'QUOTE_SENT' THEN COALESCE((SELECT min(q."submittedAt") FROM "Quote" q WHERE q."rfqId" = r.id), e."createdAt")
      ELSE LEAST(now(), r."createdAt" + interval '2 days') END
    FROM "Rfq" r WHERE e."rfqId" = r.id AND e."isDemo"`;
  await prisma.$executeRaw`UPDATE "Notification" n SET "readAt" = now() FROM "User" u WHERE n."userId" = u.id AND u."isDemo" AND n."createdAt" < now() - interval '1 day'`;
  for (let d = 0; d < 30; d++) {
    await prisma.adSpendEntry.create({ data: { date: daysAgo(d), channel: d % 2 ? "Meta Ads" : "Google Search Ads", campaign: "Demo campaign (fictional)", amountMinor: rnd.int(1500, 4500), leads: rnd.int(1, 4), isDemo: true } });
  }
  // Demo emails are never sent and matching already ran inline.
  await prisma.backgroundJob.deleteMany({ where: { type: { in: ["email.send", "rfq.match", "ai.enrich_rfq"] } } });
  await prisma.platformSetting.upsert({ where: { key: "demo.version" }, create: { key: "demo.version", value: { version: DEMO_BASELINE_VERSION, seededAt: new Date().toISOString() } }, update: { value: { version: DEMO_BASELINE_VERSION, seededAt: new Date().toISOString() } } });
  log(`[demo] seeded 20 manufacturers, ${buyers.length} buyers, ${made} requests (${unlocked} unlocks) in ${Math.round((Date.now() - t0) / 1000)}s`);
  return { requests: made, unlocks: unlocked };
}
