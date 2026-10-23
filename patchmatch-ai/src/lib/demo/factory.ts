import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { createRfq, processRfq, adminQualifyRfq, verifyRfqEmail } from "@/lib/domain/rfq";
import { runMatching, publishOpportunity } from "@/lib/domain/matching";
import { creditWallet } from "@/lib/domain/unlock";
import { recordSellerEvent } from "@/lib/activity";
import { randomToken, sha256 } from "@/lib/crypto";
import type { RfqSubmission } from "@/lib/rfq/schema";
import { BUYER_BRANDS, BUYER_NOTES, DEMO_BACKINGS, DEMO_PATCH_TYPES, DEMO_USES, FIRST_NAMES, LAST_NAMES, SELLER_MARKETS, US_STATES, type DemoPatchType, type SellerMarket } from "./catalog";

/** Random helpers (Math.random — demo content only). */
export const rnd = {
  pick<T>(a: readonly T[]): T {
    return a[Math.floor(Math.random() * a.length)];
  },
  int(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  chance(p: number) {
    return Math.random() < p;
  },
  weighted<T extends string>(w: Record<T, number>): T {
    const total = Object.values<number>(w).reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (const [k, v] of Object.entries<number>(w)) if ((r -= v) <= 0) return k as T;
    return Object.keys(w)[0] as T;
  },
};

/**
 * Shared demo artwork: one stored object per patch type (original + preview + teaser). Demo
 * attachments point at these objects instead of uploading copies, which keeps storage usage
 * flat. Their unique storageKey is "demo-shared/<type>/original.webp~<uuid>"; objectKey()
 * strips the "~suffix" when reading. Only keys under demo-shared/ are ever rewritten.
 */
export const DEMO_ART_PREFIX = "demo-shared/";

export async function demoArtworkPool(): Promise<Record<string, { key: string; previewKey: string; teaserKey: string; size: number; sha: string }>> {
  const row = await prisma.platformSetting.findUnique({ where: { key: "demo.artworkPool" } });
  return (row?.value ?? {}) as Record<string, { key: string; previewKey: string; teaserKey: string; size: number; sha: string }>;
}

export async function demoAttachmentFor(patchType: string, guestOwnerHash: string) {
  const pool = await demoArtworkPool();
  const art = pool[patchType] ?? pool[rnd.pick(Object.keys(pool))];
  if (!art) return null;
  const a = await prisma.attachment.create({
    data: {
      purpose: "RFQ_ARTWORK", status: "READY", storageKey: `${art.key}~${randomUUID()}`, previewKey: art.previewKey, teaserKey: art.teaserKey,
      originalFilename: `${patchType.toLowerCase()}-artwork.webp`, sanitizedFilename: `${patchType.toLowerCase()}-artwork.webp`, mimeType: "image/webp", extension: "webp",
      sizeBytes: art.size, sha256: art.sha, scanStatus: "UNSUPPORTED", guestOwnerHash,
    },
  });
  return a.id;
}

function companyName(market: SellerMarket) {
  const m = SELLER_MARKETS[market];
  return `${rnd.pick(m.prefixes as readonly string[])} ${rnd.pick(m.suffixes as readonly string[])}`;
}

export async function uniqueSellerSlug(base: string) {
  const root = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
  for (let i = 0; i < 50; i++) {
    const slug = i ? `${root}-${i + 1}` : root;
    const taken = (await prisma.organization.findUnique({ where: { slug } })) || (await prisma.sellerProfile.findUnique({ where: { publicSlug: slug } }));
    if (!taken) return slug;
  }
  return `${root}-${randomToken(4).toLowerCase()}`;
}

export interface DemoSellerOptions {
  market?: SellerMarket;
  status?: "VERIFIED" | "PENDING_REVIEW" | "INFO_REQUIRED" | "UNVERIFIED" | "SUSPENDED";
  email?: string;
  name?: string;
  company?: string;
  passwordHash: string;
  allTypes?: boolean;
  star?: boolean;
  simulated?: boolean;
  credits?: number;
  createdAt?: Date;
  reviewerId?: string | null;
}

/** A fictional manufacturer with capabilities, performance figures and (if verified) demo credits. */
export async function createDemoSeller(o: DemoSellerOptions) {
  const market = o.market ?? rnd.weighted({ PK: SELLER_MARKETS.PK.weight, US: SELLER_MARKETS.US.weight, IN: SELLER_MARKETS.IN.weight });
  const m = SELLER_MARKETS[market];
  const [city, region] = rnd.pick(m.cities as readonly (readonly [string, string])[]);
  const company = o.company ?? companyName(market);
  const person = o.name ?? `${rnd.pick(FIRST_NAMES)} ${rnd.pick(LAST_NAMES)}`;
  const slug = await uniqueSellerSlug(company);
  const email = o.email ?? `${slug}-${randomToken(3).toLowerCase()}@sellers.patchmatch.demo`;
  const status = o.status ?? "VERIFIED";
  const years = o.star ? 22 : rnd.int(3, 28);
  const types = o.allTypes ? [...DEMO_PATCH_TYPES] : [...new Set<DemoPatchType>(["EMBROIDERED", ...Array.from({ length: rnd.int(1, 4) }, () => rnd.pick(DEMO_PATCH_TYPES))])];
  const created = o.createdAt ?? new Date(Date.now() - rnd.int(5, 400) * 86_400_000);
  const user = await prisma.user.create({ data: { email, name: person, passwordHash: o.passwordHash, emailVerifiedAt: created, isDemo: true, createdAt: created } });
  const org = await prisma.organization.create({
    data: {
      type: "SELLER", name: company, slug, country: market, isDemo: true, createdAt: created,
      members: { create: { userId: user.id, role: "OWNER" } }, wallet: { create: { currency: "USD" } },
      sellerProfile: {
        create: {
          legalName: `${company} ${market === "US" ? "LLC" : market === "IN" ? "Pvt. Ltd." : "(Pvt.) Ltd."}`, tradingName: company, publicSlug: slug, country: market, city, region,
          contactName: person, email, phone: `${m.phone}${rnd.int(100, 999)} ${rnd.int(1000000, 9999999)}`, website: `https://${slug.replace(/-/g, "")}.example`,
          verificationStatus: status, verifiedAt: status === "VERIFIED" ? created : null, yearsOperating: years, factoryLocation: `${city}, ${region}`,
          description: `${company} has produced custom patches for ${years} years from ${city}. Fictional demo manufacturer.`,
          exportMarkets: market === "US" ? ["US", "CA"] : ["US", "GB", "CA", "AU", "AE"], shippingCountries: market === "US" ? ["US", "CA"] : ["US", "GB", "CA", "AU", "DE"],
          backingOptions: ["SEW_ON", "IRON_ON", "HOOK_AND_LOOP", ...(rnd.chance(0.6) ? (["ADHESIVE"] as const) : [])], borderOptions: ["MERROWED", "HOT_CUT", "LASER_CUT"],
          artworkSupport: o.star || rnd.chance(0.8), sampleCapable: o.star || rnd.chance(0.7), rushCapable: o.star || rnd.chance(0.5),
          dailyRfqLimit: 30, maxDailySpendMinor: 100_000, isDemo: true, simulated: !!o.simulated, notificationPrefs: { emailOpportunities: false },
          avgResponseMinutes: o.star ? 9 : rnd.int(12, 300), quotesSubmitted: o.star ? 312 : rnd.int(4, 260),
          onTimeDeliveryPct: o.star ? 99 : rnd.int(86, 99), satisfactionPct: o.star ? 98 : rnd.int(88, 99), completedOrders: o.star ? 2140 : years * rnd.int(15, 80),
          createdAt: created,
          capabilities: {
            create: types.map((t) => ({
              patchType: t, moq: o.star ? 25 : rnd.pick([25, 50, 100, 200]), maxQuantity: o.star ? 250_000 : rnd.pick([10_000, 25_000, 100_000]), weeklyCapacity: o.star ? 60_000 : rnd.pick([3_000, 8_000, 20_000, 40_000]),
              standardDays: o.star ? 7 : rnd.int(7, 18), rushDays: o.star ? 4 : rnd.int(4, 7), priceMinMinor: rnd.int(40, 110), priceMaxMinor: rnd.int(160, 480),
            })),
          },
        },
      },
    },
    include: { sellerProfile: true },
  });
  const sp = org.sellerProfile!;
  if (status !== "UNVERIFIED") {
    await prisma.sellerVerification.create({ data: { sellerId: sp.id, fromStatus: "UNVERIFIED", toStatus: "PENDING_REVIEW", reason: "Submitted by seller", createdAt: created } });
    if (status !== "PENDING_REVIEW") {
      const reason = { VERIFIED: "Business registration, factory photos and samples reviewed.", INFO_REQUIRED: "Please upload a clearer business registration certificate.", SUSPENDED: "Repeated upheld quality claims.", REJECTED: "Could not verify the business." }[status];
      await prisma.sellerVerification.create({ data: { sellerId: sp.id, fromStatus: "PENDING_REVIEW", toStatus: status, reason, reviewerId: o.reviewerId ?? null, createdAt: created } });
    }
  }
  if (status === "VERIFIED" && (o.star || rnd.chance(0.6))) {
    const pool = await demoArtworkPool();
    const kinds = o.star ? Object.keys(pool).filter((k) => k !== "NOT_SURE") : types.slice(0, 3);
    for (const t of kinds) {
      const art = pool[t];
      if (!art) continue;
      const att = await prisma.attachment.create({
        data: {
          purpose: "PORTFOLIO", status: "READY", storageKey: `${art.key}~${randomUUID()}`, previewKey: art.previewKey, teaserKey: art.teaserKey, originalFilename: `${t.toLowerCase()}-sample.webp`,
          sanitizedFilename: `${t.toLowerCase()}-sample.webp`, mimeType: "image/webp", extension: "webp", sizeBytes: art.size, sha256: art.sha, scanStatus: "UNSUPPORTED", ownerOrgId: org.id, uploaderUserId: user.id,
        },
      });
      await prisma.sellerPortfolioItem.create({ data: { sellerId: sp.id, title: `${t.charAt(0)}${t.slice(1).toLowerCase()} patch sample`, patchType: t as DemoPatchType, attachmentId: att.id } });
    }
  }
  if (status === "VERIFIED" && (o.credits ?? 0) > 0) {
    await prisma.$transaction((tx) => creditWallet(tx, { orgId: org.id, amountMinor: o.credits!, currency: "USD", type: "ADJUSTMENT", memo: "Demo credits (fictional)", idempotencyKey: `demo-credit:${org.id}` }));
  }
  if (status === "PENDING_REVIEW" && o.simulated) await recordSellerEvent("SELLER_APPLIED", sp.id);
  return { seller: sp, orgId: org.id, user };
}

export interface DemoRfqOptions {
  adminId: string | null;
  buyer?: { userId: string; orgId: string; name: string; email: string; company: string };
  patchType?: DemoPatchType;
  quantity?: number;
  leadSource?: string;
  shared?: boolean;
  simulated?: boolean;
  createdAt?: Date;
  /** Stop the pipeline early to leave some requests in review/verification. */
  stopAt?: "unverified" | "review" | "matching";
}

/** A buyer RFQ pushed through the real pipeline: submission → email verification → qualification → matching → publication. */
export async function createDemoRfq(o: DemoRfqOptions) {
  const type = o.patchType ?? rnd.pick(DEMO_PATCH_TYPES);
  const quantity = o.quantity ?? rnd.pick([50, 100, 150, 200, 300, 500, 750, 1000, 1500, 2500, 5000, 10000]);
  const brand = o.buyer?.company ?? rnd.pick(BUYER_BRANDS);
  const person = o.buyer?.name ?? `${rnd.pick(FIRST_NAMES)} ${rnd.pick(LAST_NAMES)}`;
  const email = o.buyer?.email ?? `${person.toLowerCase().replace(/[^a-z]+/g, ".")}.${randomToken(3).toLowerCase()}@buyers.patchmatch.demo`;
  const guest = `demo-guest:${randomToken(8)}`;
  const art = await demoAttachmentFor(type, guest);
  const unit = { EMBROIDERED: 1.6, PVC: 2.1, CHENILLE: 3.4, WOVEN: 1.3, SUBLIMATED: 1.1, LEATHER: 2.6, PRINTED: 0.8 }[type];
  const shared = !!o.shared;
  const sub = {
    patchType: type, intendedUse: rnd.pick(DEMO_USES), unit: "IN", width: rnd.pick([2, 2.5, 3, 3.5, 4]), height: rnd.pick([2, 2.5, 3, 3.5]), borderType: type === "PVC" ? "NONE" : "MERROWED",
    quantity, repeatPotential: rnd.chance(0.5), sampleRequired: rnd.chance(0.3), backing: rnd.pick(DEMO_BACKINGS), colorCount: rnd.int(2, 9), specialFinishing: [],
    artworkIds: art ? [art] : [], artworkNotes: rnd.pick(BUYER_NOTES[type]), destinationCountry: "US", destinationState: rnd.pick(US_STATES), destinationPostal: String(rnd.int(10000, 99999)),
    requiredBy: new Date(Date.now() + rnd.int(21, 75) * 86_400_000).toISOString().slice(0, 10), rush: rnd.chance(0.15), sampleBeforeProduction: rnd.chance(0.5),
    budgetUndisclosed: rnd.chance(0.35), budgetTotal: Math.round(quantity * unit * (0.8 + Math.random() * 0.6)),
    contactName: person, contactCompany: brand, contactEmail: email, contactPhone: `+1 ${rnd.int(201, 989)} 555 ${String(rnd.int(100, 199)).padStart(4, "0")}`, preferredContact: "EMAIL",
    consentMatching: true, consentSharing: true, disclosureMode: rnd.chance(0.15) ? "PLATFORM_MESSAGING_ONLY" : "FULL_CONTACT", consentTerms: true, consentMarketing: false, website2: "",
    maxRecipients: shared ? 3 : 1, leadSource: o.leadSource ?? "marketplace",
  } as unknown as RfqSubmission;
  const { rfq } = await createRfq(sub, { guestOwnerHash: guest, ip: `198.51.100.${rnd.int(1, 250)}`, isDemo: true, attribution: { utm_source: rnd.pick(["meta", "google", "seo", "referral", "direct"]), utm_campaign: rnd.pick(["fall-launch", "brand-search", "retarget", "hats-q4"]) } });
  const created = o.createdAt ?? new Date();
  await prisma.rfq.update({ where: { id: rfq.id }, data: { createdAt: created, submittedAt: created, simulated: !!o.simulated, ...(o.buyer ? { buyerOrgId: o.buyer.orgId, buyerUserId: o.buyer.userId } : {}) } });
  if (o.stopAt === "unverified") return rfq;
  const token = randomToken();
  await prisma.verificationToken.create({ data: { tokenHash: sha256(token), purpose: "RFQ_EMAIL_VERIFY", email, data: { rfqId: rfq.id }, expiresAt: new Date(Date.now() + 3_600_000) } });
  await verifyRfqEmail(token);
  await processRfq(rfq.id);
  if (o.stopAt === "review") return rfq;
  await adminQualifyRfq(o.adminId, rfq.id, { tier: rnd.chance(0.8) ? "A" : "B", pricingTier: quantity >= 1000 ? "PREMIUM" : rnd.chance(0.5) ? "HIGH_INTENT" : "STANDARD", note: "Demo qualification", source: o.adminId ? "ADMIN" : "SYSTEM" });
  const m = await runMatching(rfq.id, o.adminId);
  if (!m.eligible || o.stopAt === "matching") return rfq;
  const fresh = await prisma.rfq.findUniqueOrThrow({ where: { id: rfq.id }, include: { opportunity: true } });
  if (!fresh.opportunity) await publishOpportunity(rfq.id, o.adminId, fresh.maxRecipients > 1 ? { distributionMode: "LIMITED_SHARED", maxUnlocks: fresh.maxRecipients } : { distributionMode: "EXCLUSIVE" });
  return rfq;
}
