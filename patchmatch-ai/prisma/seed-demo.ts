/**
 * DEMO ENVIRONMENT SEED — fictional data only.
 *
 *  • 20 fictional buyers, 30 fictional manufacturers, 100 fictional RFQs, quotes, messages,
 *    simulated transactions, verification cases and matching scenarios.
 *  • Every record is flagged isDemo = true and names carry "(Demo)". Production reporting
 *    excludes isDemo data. Run this ONLY against a separate demo database with DEMO_MODE=true.
 *  • Data flows through the real domain services (qualification, matching, publishing, unlocks,
 *    quotes, disputes) so the demo exercises the same code paths as production.
 *
 * Usage: DEMO_MODE=true npm run db:seed:demo   (refuses to run unless DEMO_MODE=true)
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { createRfq, verifyRfqEmail, processRfq, adminQualifyRfq, adminRequestClarification, adminRejectRfq } from "../src/lib/domain/rfq";
import { runMatching, publishOpportunity } from "../src/lib/domain/matching";
import { startUnlock, creditWallet } from "../src/lib/domain/unlock";
import { saveQuote, buyerQuoteAction } from "../src/lib/domain/quotes";
import { postMessage } from "../src/lib/domain/messages";
import { fileDispute, decideDispute } from "../src/lib/domain/finance";
import { storage } from "../src/lib/services/storage";
import { generatePreviews } from "../src/lib/services/storage/previews";
import { randomToken, sha256 } from "../src/lib/crypto";
import sharp from "sharp";
import bcrypt from "bcryptjs";
import type { RfqSubmission } from "../src/lib/rfq/schema";

if (process.env.DEMO_MODE !== "true") {
  console.error("Refusing to seed demo data: set DEMO_MODE=true and point DATABASE_URL at a dedicated demo database.");
  process.exit(1);
}

// Deterministic pseudo-random generator so the demo is reproducible.
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)];
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

const FIRST = ["Avery", "Jordan", "Riley", "Casey", "Morgan", "Taylor", "Quinn", "Reese", "Skyler", "Rowan", "Emerson", "Hayden", "Parker", "Sawyer", "Dakota", "Finley", "Harper", "Kendall", "Logan", "Peyton"];
const LAST = ["Brooks", "Carter", "Diaz", "Ellis", "Foster", "Gray", "Hughes", "Irwin", "Jensen", "Keller", "Lane", "Moreno", "Nash", "Ortiz", "Price", "Reed", "Shaw", "Tate", "Vance", "Wells"];
const BRANDS = ["Northbound Supply", "Ember & Oak", "Static Bloom", "Ridgeway Athletics", "Copperline Caps", "Lantern Club", "Harbor Street", "Bluefin Racing", "Granite Guild", "Moonlit Collective", "Pine Hollow Scouts", "Velvet Arcade", "Summit Run Co", "Driftwood Denim", "Halcyon Events", "Iron Kite", "Juniper Lane", "Kestrel Outdoor", "Lowtide Skate", "Maple & Mortar"];
const STATES = ["CA", "NY", "TX", "FL", "IL", "WA", "CO", "GA", "NC", "OR", "AZ", "MA"];
const SELLER_CITIES_PK = ["Sialkot", "Lahore", "Karachi", "Faisalabad", "Gujranwala"];
const SELLER_CITIES_US = ["Los Angeles", "Dallas", "Charlotte", "Chicago", "Newark"];
const TYPES = ["EMBROIDERED", "PVC", "CHENILLE", "WOVEN", "SUBLIMATED", "LEATHER", "PRINTED"] as const;
const USES = ["CLOTHING_BRAND", "STREETWEAR", "HATS", "UNIFORMS", "SPORTS_TEAMS", "CLUBS", "EVENTS", "PROMOTIONAL"] as const;
const BACKINGS = ["SEW_ON", "IRON_ON", "HOOK_AND_LOOP", "ADHESIVE"] as const;

async function demoArtwork(label: string, hue: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" rx="120" fill="hsl(${hue},60%,30%)"/><circle cx="300" cy="260" r="140" fill="hsl(${(hue + 160) % 360},80%,60%)"/><text x="300" y="500" font-size="64" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold">${label}</text></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const att = await prisma.attachment.create({ data: { purpose: "RFQ_ARTWORK", storageKey: `pending/${randomToken(12)}`, originalFilename: `${label.toLowerCase().replace(/\W+/g, "-")}-logo.png`, sanitizedFilename: "logo.png", mimeType: "image/png", extension: "png", sizeBytes: png.length, guestOwnerHash: "demo-seed" } });
  const key = `rfq_artwork/demo/${att.id}/logo.png`;
  const p = await generatePreviews(png);
  await storage().put(key, png, "image/png");
  await storage().put(`${key}.preview.webp`, p.preview, "image/webp");
  await storage().put(`${key}.teaser.webp`, p.teaser, "image/webp");
  await prisma.attachment.update({ where: { id: att.id }, data: { storageKey: key, previewKey: `${key}.preview.webp`, teaserKey: `${key}.teaser.webp`, status: "READY", sha256: sha256(png), scanStatus: "UNSUPPORTED" } });
  return att.id;
}

async function main() {
  const existing = await prisma.user.count({ where: { isDemo: true } });
  if (existing > 0) {
    console.log(`[demo] ${existing} demo users already exist — skipping (drop the demo database to reseed).`);
    return;
  }
  const password = await bcrypt.hash(process.env.DEMO_PASSWORD ?? "DemoPass!2026", 12);

  // Demo admin (separate from the real admin).
  const admin = await prisma.user.create({ data: { email: "demo-admin@patchmatch.demo", name: "Demo Admin (Demo)", passwordHash: password, platformRole: "SUPER_ADMIN", emailVerifiedAt: new Date(), mfaEnabledAt: null, isDemo: true } });

  // ── 30 manufacturers with verification cases ──
  const sellers: { id: string; orgId: string; userId: string; email: string }[] = [];
  for (let i = 0; i < 30; i++) {
    const pk = i < 20;
    const name = `${pick(["Crest", "Thread", "Loom", "Stitch", "Badge", "Emblem", "Patchworks", "Needle"])} ${pick(["Craft", "Works", "Industries", "Studio", "Manufacturing", "Atelier"])} ${i + 1} (Demo)`;
    const email = `seller${i + 1}@patchmatch.demo`;
    const status = i < 22 ? "VERIFIED" : i < 25 ? "PENDING_REVIEW" : i < 27 ? "INFO_REQUIRED" : i < 29 ? "UNVERIFIED" : "SUSPENDED";
    const user = await prisma.user.create({ data: { email, name: `${pick(FIRST)} ${pick(LAST)} (Demo)`, passwordHash: password, emailVerifiedAt: new Date(), isDemo: true } });
    const types = [...new Set<(typeof TYPES)[number]>([pick(TYPES), pick(TYPES), i % 3 === 0 ? "EMBROIDERED" : pick(TYPES), "EMBROIDERED"])];
    const org = await prisma.organization.create({
      data: {
        type: "SELLER", name, slug: `demo-seller-${i + 1}`, country: pk ? "PK" : "US", isDemo: true, members: { create: { userId: user.id, role: "OWNER" } }, wallet: { create: { currency: "USD" } },
        sellerProfile: {
          create: {
            legalName: name, publicSlug: `demo-seller-${i + 1}`, country: pk ? "PK" : "US", city: pk ? pick(SELLER_CITIES_PK) : pick(SELLER_CITIES_US), contactName: user.name!, email, phone: pk ? "+92 300 0000000" : "+1 555 0100",
            verificationStatus: status, verifiedAt: status === "VERIFIED" ? new Date() : null, yearsOperating: int(1, 25), factoryLocation: pk ? "Sialkot, Punjab" : "Los Angeles, CA",
            description: "Fictional demo manufacturer for product demonstrations.", exportMarkets: ["US", "GB", "CA"], shippingCountries: pk ? ["US", "GB", "CA", "AU"] : ["US", "CA"],
            backingOptions: ["SEW_ON", "IRON_ON", "HOOK_AND_LOOP", ...(i % 2 ? (["ADHESIVE"] as const) : [])], borderOptions: ["MERROWED", "HOT_CUT", "LASER_CUT"], artworkSupport: i % 4 !== 0, sampleCapable: i % 3 !== 0, rushCapable: i % 2 === 0,
            dailyRfqLimit: 20, maxDailySpendMinor: 50_000, isDemo: true, notificationPrefs: { emailOpportunities: false }, avgResponseMinutes: i < 10 ? int(30, 900) : null, quotesSubmitted: 0,
            capabilities: { create: types.map((t) => ({ patchType: t, moq: pick([25, 50, 100, 250]), maxQuantity: pick([5000, 20000, 100000]), weeklyCapacity: pick([2000, 5000, 15000]), standardDays: int(7, 21), rushDays: int(4, 7), priceMinMinor: int(40, 120), priceMaxMinor: int(150, 450) })) },
          },
        },
      },
      include: { sellerProfile: true },
    });
    const sp = org.sellerProfile!;
    await prisma.sellerVerification.create({ data: { sellerId: sp.id, fromStatus: "UNVERIFIED", toStatus: status === "UNVERIFIED" ? "UNVERIFIED" : "PENDING_REVIEW", reason: "Submitted (demo)" } });
    if (status !== "UNVERIFIED" && status !== "PENDING_REVIEW") await prisma.sellerVerification.create({ data: { sellerId: sp.id, fromStatus: "PENDING_REVIEW", toStatus: status, reason: status === "INFO_REQUIRED" ? "Please upload a clearer business registration certificate (demo)." : status === "SUSPENDED" ? "Repeated upheld quality claims (demo)." : "Documents and samples reviewed (demo).", reviewerId: admin.id } });
    if (status === "VERIFIED") await prisma.$transaction((tx) => creditWallet(tx, { orgId: org.id, amountMinor: 20_000, currency: "USD", type: "ADJUSTMENT", memo: "Demo credits (fictional)", idempotencyKey: `demo-credit:${org.id}` }));
    sellers.push({ id: sp.id, orgId: org.id, userId: user.id, email });
  }

  // ── 20 buyers ──
  const buyers: { userId: string; email: string; name: string; company: string }[] = [];
  for (let i = 0; i < 20; i++) {
    const name = `${FIRST[i]} ${LAST[(i * 7) % LAST.length]} (Demo)`;
    const email = `buyer${i + 1}@patchmatch.demo`;
    const user = await prisma.user.create({ data: { email, name, passwordHash: password, emailVerifiedAt: new Date(), isDemo: true } });
    await prisma.organization.create({ data: { type: "BUYER", name: `${BRANDS[i]} (Demo)`, slug: `demo-buyer-${i + 1}`, isDemo: true, members: { create: { userId: user.id, role: "OWNER" } }, buyerProfile: { create: { companyName: `${BRANDS[i]} (Demo)` } } } });
    buyers.push({ userId: user.id, email, name, company: `${BRANDS[i]} (Demo)` });
  }

  // ── 100 RFQs through the real pipeline ──
  const artworkPool: string[] = [];
  for (let i = 0; i < 12; i++) artworkPool.push(await demoArtwork(`DEMO ${i + 1}`, i * 30));
  let n = 0;
  for (let i = 0; i < 100; i++) {
    const b = buyers[i % 20];
    const type = i % 9 === 0 ? "NOT_SURE" : pick(TYPES);
    const quantity = pick([50, 100, 200, 300, 500, 750, 1000, 2500, 5000]);
    const scenario = i < 8 ? "unverified" : i < 14 ? "clarify" : i < 18 ? "reject" : i < 24 ? "review" : "qualify";
    const art = scenario === "clarify" ? [] : [artworkPool.shift() ?? ""].filter(Boolean);
    const sub = {
      patchType: type, intendedUse: pick(USES), unit: "IN", width: scenario === "clarify" ? undefined : pick([2, 2.5, 3, 3.5, 4]), height: scenario === "clarify" ? undefined : pick([2, 2.5, 3, 3.5]), borderType: "MERROWED",
      quantity, repeatPotential: rand() > 0.5, sampleRequired: false, backing: scenario === "clarify" ? undefined : pick(BACKINGS), colorCount: int(2, 8), specialFinishing: [], artworkIds: art,
      artworkNotes: "Fictional demo request — brand colours navy and white.", destinationCountry: "US", destinationState: pick(STATES), destinationPostal: String(int(10000, 99999)),
      requiredBy: new Date(Date.now() + int(25, 90) * 86_400_000).toISOString().slice(0, 10), rush: rand() > 0.85, sampleBeforeProduction: rand() > 0.6, budgetUndisclosed: rand() > 0.7, budgetTotal: quantity * pick([1.2, 1.8, 2.5, 3.5]),
      contactName: b.name, contactCompany: b.company, contactEmail: b.email, contactPhone: "+1 555 01" + String(10 + (i % 80)), preferredContact: "EMAIL",
      consentMatching: true, consentSharing: true, disclosureMode: i % 6 === 0 ? "PLATFORM_MESSAGING_ONLY" : "FULL_CONTACT", consentTerms: true, consentMarketing: false, website2: "",
    } as unknown as RfqSubmission;
    if (art.length) await prisma.attachment.update({ where: { id: art[0] }, data: { guestOwnerHash: "demo-seed" } });
    const { rfq } = await createRfq(sub, { guestOwnerHash: art.length ? "demo-seed" : null, ip: `198.51.100.${i % 250}`, isDemo: true, attribution: { utm_source: pick(["meta", "google", "seo", "referral"]), utm_campaign: pick(["fall-launch", "brand-search", "retarget"]) } });
    // Spread creation dates over the last 60 days.
    const created = new Date(Date.now() - int(0, 60) * 86_400_000);
    await prisma.rfq.update({ where: { id: rfq.id }, data: { createdAt: created, submittedAt: created } });
    if (scenario === "unverified") continue;
    const token = randomToken();
    await prisma.verificationToken.create({ data: { tokenHash: sha256(token), purpose: "RFQ_EMAIL_VERIFY", email: b.email, data: { rfqId: rfq.id }, expiresAt: new Date(Date.now() + 3_600_000) } });
    await verifyRfqEmail(token);
    await prisma.rfq.update({ where: { id: rfq.id }, data: { buyerOrgId: (await prisma.organizationMember.findFirstOrThrow({ where: { userId: b.userId } })).orgId, buyerUserId: b.userId } });
    await processRfq(rfq.id);
    if (scenario === "clarify") {
      await adminRequestClarification(admin.id, rfq.id, ["What size should the patch be?", "Which backing do you need?"]);
      continue;
    }
    if (scenario === "reject") {
      await adminRejectRfq(admin.id, rfq.id, "Duplicate test submission (demo)");
      continue;
    }
    if (scenario === "review") continue;
    await adminQualifyRfq(admin.id, rfq.id, { tier: i % 4 === 0 ? "B" : "A", pricingTier: quantity >= 1000 ? "PREMIUM" : i % 4 === 0 ? "STANDARD" : "HIGH_INTENT", note: "Demo qualification" });
    const m = await runMatching(rfq.id, admin.id);
    if (!m.eligible || i % 10 === 3) continue; // leave some in matching / manual sourcing
    await publishOpportunity(rfq.id, admin.id, { distributionMode: "EXCLUSIVE" });
    if (i % 3 === 0) continue; // available, unsold
    const notified = await prisma.rfqMatch.findMany({ where: { rfqId: rfq.id, status: "NOTIFIED" }, include: { seller: { include: { org: { include: { members: { include: { user: true } } } } } } } });
    const s = notified[0]?.seller;
    if (!s) continue;
    const owner = s.org.members[0].user;
    try {
      await startUnlock({ sellerId: s.id, orgId: s.orgId, userId: owner.id, userEmail: owner.email, rfqId: rfq.id, method: "CREDITS" });
    } catch (e) {
      console.warn(`[demo] unlock skipped for ${rfq.publicRef}: ${(e as Error).message}`);
      continue;
    }
    n++;
    if (i % 5 === 1) {
      const unlock = await prisma.rfqUnlock.findFirstOrThrow({ where: { rfqId: rfq.id, sellerId: s.id } });
      const d = await fileDispute({ sellerId: s.id, userId: owner.id, unlockId: unlock.id, reason: "INVALID_CONTACT", description: "Demo claim: phone number unreachable and email bounced twice." });
      if (i % 10 === 1) await decideDispute({ adminId: admin.id, disputeId: d.id, decision: "CREDIT", note: "Demo decision: bounce verified, credit issued." });
      continue;
    }
    const q = await saveQuote({
      sellerId: s.id, userId: owner.id, rfqId: rfq.id, submit: true,
      input: { quantity, unitPrice: pick([0.9, 1.15, 1.4, 1.85, 2.4]), setupFee: pick([0, 25, 40, 60]), sampleFee: 0, toolingFee: type === "PVC" ? 80 : 0, artworkFee: 0, shipping: pick([45, 65, 90]), currency: "USD", productionDays: int(8, 18), deliveryEstimate: "5–7 business days by courier", samplePolicy: "Digital proof free; physical sample $25", paymentTerms: "50% deposit, 50% before shipping", revisionPolicy: "Two free proof revisions", notes: "Fictional demo quotation.", validDays: 30 },
    });
    await postMessage({ rfqId: rfq.id, sellerId: s.id, side: "SELLER", userId: owner.id, body: "Hi! Thanks for your request (demo). We've sent a quote — happy to adjust colours or size." });
    await postMessage({ rfqId: rfq.id, sellerId: s.id, side: "BUYER", userId: b.userId, body: "Thanks — could you confirm the thread colours match our navy? (demo)" });
    if (i % 4 === 0) await buyerQuoteAction({ rfqId: rfq.id, quoteId: q.id, userId: b.userId, action: "SELECT" });
  }

  // Simulated ad spend (clearly fictional) for CPL/forecast demos.
  for (let d = 0; d < 30; d++) {
    await prisma.adSpendEntry.create({ data: { date: new Date(Date.now() - d * 86_400_000), channel: d % 2 ? "Meta Ads" : "Google Search Ads", campaign: "Demo campaign (fictional)", amountMinor: int(4000, 12000), leads: int(1, 5), isDemo: true } });
  }
  await prisma.backgroundJob.deleteMany({ where: { type: "email.send" } }); // demo emails are never sent
  console.log(`[demo] seeded 20 buyers, 30 manufacturers, 100 RFQs (${n} unlocked). Sign in as demo-admin@patchmatch.demo / buyer1@patchmatch.demo / seller1@patchmatch.demo with DEMO_PASSWORD.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
