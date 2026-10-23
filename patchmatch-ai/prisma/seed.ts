/**
 * Idempotent production seed — safe to run on every deploy. Never overwrites admin edits.
 * Creates: super admin (from env), launch pricing rules, matching configuration, feature flags,
 * and platform settings. No demo data here (see seed-demo.ts).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { databaseUrl } from "../src/lib/database-url";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl() }) });

const FLAGS = [
  { key: "limited_shared_rfqs", enabled: false, description: "Allow LIMITED_SHARED distribution (requires tested multi-recipient buyer consent). Launch: OFF." },
  { key: "auto_qualify_tier_a", enabled: false, description: "Skip human review for low-risk Tier A RFQs. Launch: OFF (human review)." },
  { key: "auto_publish_matched", enabled: false, description: "Publish exclusive opportunities automatically after matching. Launch: OFF." },
  { key: "card_payments", enabled: false, description: "Show card checkout to sellers (requires an approved payment provider)." },
  { key: "whatsapp_notifications", enabled: false, description: "Optional WhatsApp notifications (provider integration pending)." },
  { key: "sms_notifications", enabled: false, description: "Optional SMS notifications (provider integration pending)." },
];

const RULES = [
  { name: "Standard Verified (pilot)", tier: "STANDARD" as const, priceMinor: 1000 },
  { name: "Contact-Ready (pilot)", tier: "HIGH_INTENT" as const, priceMinor: 1250 },
  { name: "Premium Production-Ready (pilot)", tier: "PREMIUM" as const, priceMinor: 1500 },
];
/** Earlier launch defaults; rules still at these untouched values move to pilot pricing. Admin-edited prices are left alone. */
const LEGACY_DEFAULTS: Record<string, number> = { STANDARD: 1500, HIGH_INTENT: 2000, PREMIUM: 2500 };

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await prisma.user.create({ data: { email, name: "Platform Admin", passwordHash: await bcrypt.hash(password, 12), platformRole: "SUPER_ADMIN", emailVerifiedAt: new Date() } });
      console.log(`[seed] created super admin ${email} — sign in and enable two-factor authentication.`);
    }
  } else {
    console.log("[seed] SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD not set — skipping admin user.");
  }

  for (const f of FLAGS) await prisma.featureFlag.upsert({ where: { key: f.key }, create: f, update: { description: f.description } });

  if ((await prisma.pricingRule.count()) === 0) {
    for (const r of RULES) await prisma.pricingRule.create({ data: { ...r, minMinor: 500, maxMinor: 50_000, currency: "USD", priority: 0, active: true } });
    console.log("[seed] created pilot pricing rules ($10 / $12.50 / $15).");
  } else {
    for (const r of RULES) {
      const n = await prisma.pricingRule.updateMany({ where: { tier: r.tier, active: true, patchType: null, distributionMode: null, name: { endsWith: "(launch)" }, priceMinor: LEGACY_DEFAULTS[r.tier] }, data: { priceMinor: r.priceMinor, name: r.name } });
      if (n.count) console.log(`[seed] moved ${r.tier} launch default to pilot price ${r.priceMinor / 100}.`);
    }
  }

  if ((await prisma.matchingConfiguration.count()) === 0) {
    await prisma.matchingConfiguration.create({
      data: { version: "launch-v1", active: true, minScore: 40, maxNotified: 5, weights: { capability: 25, capacity: 20, delivery: 20, quality: 15, budget: 10, responsiveness: 5, logistics: 5 } },
    });
  }

  const settings: Record<string, unknown> = {
    bankTransfer: { accountName: "", bankName: "", iban: "", swift: "", instructions: "Bank transfer details are provided on each invoice once configured by finance." },
    support: { email: process.env.SUPPORT_EMAIL ?? "", whatsapp: "" },
    rfqQuality: { claimWindowDays: 7 },
    marketplace: {},
  };
  for (const [key, value] of Object.entries(settings)) await prisma.platformSetting.upsert({ where: { key }, create: { key, value: value as object }, update: {} });
  console.log("[seed] done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
