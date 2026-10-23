import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";

/**
 * Admin-configurable marketplace operating parameters (PlatformSetting "marketplace").
 * Prices live in PricingRule; everything else that operations tunes during the pilot lives here.
 */
export const marketplaceSettingsSchema = z.object({
  /** Maximum manufacturers on a shared RFQ (buyer consent may allow fewer). */
  sharedSellerLimit: z.number().int().min(2).max(10).default(3),
  /** A "ready for quotes" confirmation older than this no longer counts as Contact-Ready. */
  contactReadyMaxAgeDays: z.number().int().min(1).max(90).default(14),
  /** Buyer intent becomes EXPIRED after this many days without reconfirmation. */
  intentExpiryDays: z.number().int().min(1).max(180).default(30),
  /** Hours after a quote is sent to remind a buyer who hasn't opened it (max two reminders). */
  quoteReminderHours: z.array(z.number().int().min(1).max(336)).max(2).default([24, 72]),
  /** Hours after an unlock to remind a manufacturer who hasn't quoted. */
  sellerReminderHours: z.number().int().min(1).max(336).default(24),
  /** Days after purchase in which a quality claim can be filed (subject to policy review). */
  claimWindowDays: z.number().int().min(1).max(60).default(7),
  /** Default weekly RFQ capacity for a manufacturer (purchases per 7 days). */
  sellerWeeklyCapacity: z.number().int().min(1).max(500).default(25),
  /** "open" accepts requests; "waitlist" accepts them but holds matching until supply allows. */
  intakeMode: z.enum(["open", "waitlist"]).default("open"),
});
export type MarketplaceSettings = z.infer<typeof marketplaceSettingsSchema>;

/** Pass the transaction client when called inside a transaction (avoids a second pooled connection). */
export async function marketplaceSettings(db: Pick<typeof prisma, "platformSetting"> = prisma): Promise<MarketplaceSettings> {
  const row = await db.platformSetting.findUnique({ where: { key: "marketplace" } }).catch(() => null);
  const parsed = marketplaceSettingsSchema.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : marketplaceSettingsSchema.parse({});
}

export async function saveMarketplaceSettings(value: MarketplaceSettings) {
  const v = marketplaceSettingsSchema.parse(value);
  await prisma.platformSetting.upsert({ where: { key: "marketplace" }, create: { key: "marketplace", value: v }, update: { value: v } });
  return v;
}
