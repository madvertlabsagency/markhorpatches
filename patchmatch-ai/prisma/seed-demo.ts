/**
 * DEMO ENVIRONMENT SEED — fictional data only.
 *
 *  • 3 presenter accounts (admin, manufacturer, buyer), 200 fictional manufacturers in Pakistan,
 *    the US and India (verified, pending applications, info requested, suspended), 40 fictional
 *    buyer brands and ~160 requests pushed through the real pipeline (qualification, matching,
 *    publication, credit unlocks, quotations, messages, buyer selections).
 *  • Every record is isDemo=true and the UI shows a "fictional demo" banner on every page.
 *    Production reporting excludes isDemo data. Run ONLY against a dedicated demo database.
 *  • Artwork comes from the brand-kit patch samples in public/patches (one stored object per type).
 *
 * Usage: DEMO_MODE=true npm run db:seed:demo          (refuses unless DEMO_MODE=true)
 *        npm run db:seed:demo -- --if-demo            (no-op unless DEMO_MODE=true; used by vercel-build)
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import { storage } from "../src/lib/services/storage";
import { generatePreviews } from "../src/lib/services/storage/previews";
import { sha256 } from "../src/lib/crypto";
import { startUnlock } from "../src/lib/domain/unlock";
import { saveQuote, buyerQuoteAction } from "../src/lib/domain/quotes";
import { postMessage } from "../src/lib/domain/messages";
import { fileDispute, decideDispute } from "../src/lib/domain/finance";
import { createDemoRfq, createDemoSeller, rnd } from "../src/lib/demo/factory";
import { BUYER_BRANDS, DEMO_ACCOUNTS, DEMO_PASSWORD_DEFAULT, DEMO_PATCH_TYPES, FIRST_NAMES, LAST_NAMES, UNIT_PRICE, type DemoPatchType } from "../src/lib/demo/catalog";
import { PATCH_TYPES } from "../src/lib/catalog";

const IF_DEMO = process.argv.includes("--if-demo");
if (process.env.DEMO_MODE !== "true") {
  if (IF_DEMO) process.exit(0);
  console.error("Refusing to seed demo data: set DEMO_MODE=true and point DATABASE_URL at a dedicated demo database.");
  process.exit(1);
}

const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * 86_400_000 - h * 3_600_000);

async function artworkPool() {
  const pool: Record<string, { key: string; previewKey: string; teaserKey: string; size: number; sha: string }> = {};
  for (const t of PATCH_TYPES) {
    const file = path.join(process.cwd(), "public", "patches", `${t.slug}.webp`);
    const buf = await readFile(file);
    const p = await generatePreviews(buf);
    const key = `demo-shared/${t.code.toLowerCase()}/original.webp`;
    await storage().put(key, buf, "image/webp");
    await storage().put(`${key}.preview.webp`, p.preview, "image/webp");
    await storage().put(`${key}.teaser.webp`, p.teaser, "image/webp");
    pool[t.code] = { key, previewKey: `${key}.preview.webp`, teaserKey: `${key}.teaser.webp`, size: buf.length, sha: sha256(buf) };
  }
  pool.NOT_SURE = pool.EMBROIDERED;
  await prisma.platformSetting.upsert({ where: { key: "demo.artworkPool" }, create: { key: "demo.artworkPool", value: pool }, update: { value: pool } });
}

async function quoteFor(sellerId: string, userId: string, rfqId: string) {
  const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: rfqId }, include: { spec: true } });
  const type = (rfq.patchType === "NOT_SURE" ? "EMBROIDERED" : rfq.patchType) as DemoPatchType;
  const [lo, hi] = UNIT_PRICE[type];
  const qty = rfq.spec!.quantity;
  return saveQuote({
    sellerId, userId, rfqId, submit: true,
    input: {
      quantity: qty, unitPrice: Math.round((lo + Math.random() * (hi - lo)) * (qty >= 1000 ? 0.8 : 1) * 100) / 100, setupFee: rnd.pick([0, 25, 40, 60]), sampleFee: rnd.pick([0, 15, 25]),
      toolingFee: type === "PVC" ? 80 : 0, artworkFee: 0, shipping: rnd.pick([35, 45, 65, 90]), currency: "USD", productionDays: rnd.int(7, 18), deliveryEstimate: rnd.pick(["5–7 business days by courier", "4–6 business days DHL Express"]),
      samplePolicy: "Free digital proof; physical sample $25", paymentTerms: rnd.pick(["50% deposit, 50% before shipping", "100% after proof approval"]), revisionPolicy: "Unlimited proof revisions before production",
      notes: "Thanks for the request — we can match your thread colours exactly.", validDays: 30,
    },
  });
}

async function main() {
  if (await prisma.user.findUnique({ where: { email: DEMO_ACCOUNTS.admin.email } })) {
    console.log("[demo] Demo data already present — skipping (use a fresh demo database to reseed).");
    return;
  }
  const t0 = Date.now();
  const passwordHash = await bcrypt.hash(process.env.DEMO_PASSWORD ?? DEMO_PASSWORD_DEFAULT, 10);
  await artworkPool();
  // Demo databases show the buyer-consented limited-shared workflow; production keeps it off.
  await prisma.featureFlag.updateMany({ where: { key: "limited_shared_rfqs" }, data: { enabled: true } });
  await prisma.matchingConfiguration.updateMany({ where: { active: true }, data: { maxNotified: 8 } });

  // ── Presenter accounts ──
  const admin = await prisma.user.create({ data: { email: DEMO_ACCOUNTS.admin.email, name: DEMO_ACCOUNTS.admin.name, passwordHash, platformRole: "SUPER_ADMIN", emailVerifiedAt: new Date(), isDemo: true } });
  const star = await createDemoSeller({ market: "PK", email: DEMO_ACCOUNTS.seller.email, name: DEMO_ACCOUNTS.seller.name, company: DEMO_ACCOUNTS.seller.company, passwordHash, allTypes: true, star: true, credits: 50_000, createdAt: daysAgo(420), reviewerId: admin.id });
  await prisma.sellerProfile.update({ where: { id: star.seller.id }, data: { city: "Sialkot", region: "Punjab", factoryLocation: "Small Industrial Estate, Sialkot" } });

  // ── 200 manufacturers ──
  const statuses: ("VERIFIED" | "PENDING_REVIEW" | "INFO_REQUIRED" | "UNVERIFIED" | "SUSPENDED")[] = [
    ...Array(165).fill("VERIFIED"), ...Array(20).fill("PENDING_REVIEW"), ...Array(7).fill("INFO_REQUIRED"), ...Array(5).fill("UNVERIFIED"), ...Array(3).fill("SUSPENDED"),
  ];
  for (const [i, status] of statuses.entries()) {
    await createDemoSeller({ status, passwordHash, credits: status === "VERIFIED" ? 10_000 : 0, createdAt: status === "PENDING_REVIEW" ? daysAgo(rnd.int(0, 6), rnd.int(0, 20)) : undefined, reviewerId: admin.id });
    if (i % 50 === 49) console.log(`[demo] ${i + 1} manufacturers…`);
  }

  // ── 40 buyer brands (the presenter buyer is the first) ──
  const buyers: { userId: string; orgId: string; name: string; email: string; company: string }[] = [];
  for (let i = 0; i < 40; i++) {
    const company = i === 0 ? DEMO_ACCOUNTS.buyer.company : BUYER_BRANDS[i % BUYER_BRANDS.length];
    const name = i === 0 ? DEMO_ACCOUNTS.buyer.name : `${rnd.pick(FIRST_NAMES)} ${rnd.pick(LAST_NAMES)}`;
    const email = i === 0 ? DEMO_ACCOUNTS.buyer.email : `buyer${i + 1}@patchmatch.demo`;
    const user = await prisma.user.create({ data: { email, name, passwordHash, emailVerifiedAt: daysAgo(60), isDemo: true } });
    const org = await prisma.organization.create({ data: { type: "BUYER", name: company, slug: `demo-buyer-${i + 1}`, isDemo: true, members: { create: { userId: user.id, role: "OWNER" } }, buyerProfile: { create: { companyName: company } } } });
    buyers.push({ userId: user.id, orgId: org.id, name, email, company });
  }

  // ── ~160 requests through the real pipeline ──
  let unlocked = 0;
  for (let i = 0; i < 160; i++) {
    const buyer = i < 8 ? buyers[0] : rnd.chance(0.55) ? rnd.pick(buyers.slice(1)) : undefined;
    const created = i < 8 ? daysAgo(rnd.int(0, 12), rnd.int(1, 20)) : daysAgo(rnd.int(0, 29), rnd.int(0, 23));
    const stopAt = i % 23 === 5 ? "unverified" : i % 17 === 3 ? "review" : undefined;
    const landing = rnd.chance(0.25);
    let rfq;
    try {
      rfq = await createDemoRfq({ adminId: admin.id, buyer, patchType: rnd.pick(DEMO_PATCH_TYPES), createdAt: created, stopAt, leadSource: landing ? "landing:custom-patch-quote" : "marketplace", shared: !landing && rnd.chance(0.3) });
    } catch (e) {
      console.warn(`[demo] request ${i} skipped: ${(e as Error).message}`);
      continue;
    }
    if (i % 20 === 19) console.log(`[demo] ${i + 1} requests…`);
    if (stopAt) continue;
    const opp = await prisma.opportunity.findUnique({ where: { rfqId: rfq.id } });
    if (!opp || rnd.chance(0.38)) continue; // leave a healthy pool of open opportunities
    const notified = await prisma.rfqMatch.findMany({ where: { rfqId: rfq.id, status: "NOTIFIED" }, include: { seller: { include: { org: { include: { members: { include: { user: true } } } } } } } });
    const claimers = notified.map((m) => m.seller).filter((s) => (s.id === star.seller.id ? rnd.chance(0.35) : true)).slice(0, opp.maxUnlocks > 1 ? rnd.int(1, opp.maxUnlocks) : 1);
    for (const s of claimers) {
      const owner = s.org.members[0].user;
      try {
        await startUnlock({ sellerId: s.id, orgId: s.orgId, userId: owner.id, userEmail: owner.email, rfqId: rfq.id, method: "CREDITS" });
      } catch {
        continue;
      }
      unlocked++;
      if (rnd.chance(0.07)) {
        const u = await prisma.rfqUnlock.findFirstOrThrow({ where: { rfqId: rfq.id, sellerId: s.id } });
        const d = await fileDispute({ sellerId: s.id, userId: owner.id, unlockId: u.id, reason: "INVALID_CONTACT", description: "Phone number unreachable and email bounced twice." });
        if (rnd.chance(0.5)) await decideDispute({ adminId: admin.id, disputeId: d.id, decision: "CREDIT", note: "Bounce verified — credit issued." });
        continue;
      }
      if (s.id === star.seller.id && rnd.chance(0.4)) continue; // presenter has unlocked requests waiting for a quote
      const q = await quoteFor(s.id, owner.id, rfq.id).catch(() => null);
      if (!q) continue;
      await postMessage({ rfqId: rfq.id, sellerId: s.id, side: "SELLER", userId: owner.id, body: "Hi! Thanks for your request. We've sent an itemised quote — happy to adjust colours or size." });
      if (buyer) {
        await postMessage({ rfqId: rfq.id, sellerId: s.id, side: "BUYER", userId: buyer.userId, body: "Thanks! Could you confirm the thread colours will match our brand navy?" });
        if (rnd.chance(0.3)) await buyerQuoteAction({ rfqId: rfq.id, quoteId: q.id, userId: buyer.userId, action: "SELECT" }).catch(() => {});
      }
    }
  }

  // Align activity, unlock and quote timestamps with each request's history so charts and feeds look natural.
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
    await prisma.adSpendEntry.create({ data: { date: daysAgo(d), channel: d % 2 ? "Meta Ads" : "Google Search Ads", campaign: "Demo campaign (fictional)", amountMinor: rnd.int(4000, 12000), leads: rnd.int(3, 9), isDemo: true } });
  }
  await prisma.backgroundJob.deleteMany({ where: { type: { in: ["email.send", "rfq.match", "ai.enrich_rfq"] } } }); // demo emails are never sent; matching already ran
  console.log(`[demo] Seeded 200 manufacturers, 40 buyers, 160 requests (${unlocked} unlocks) in ${Math.round((Date.now() - t0) / 1000)}s.`);
  console.log(`[demo] Sign in as ${DEMO_ACCOUNTS.admin.email} / ${DEMO_ACCOUNTS.seller.email} / ${DEMO_ACCOUNTS.buyer.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
