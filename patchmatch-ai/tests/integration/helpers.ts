import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { createRfq } from "@/lib/domain/rfq";
import { creditWallet } from "@/lib/domain/unlock";
import type { RfqSubmission } from "@/lib/rfq/schema";

export const uid = () => randomUUID().slice(0, 8);

export async function makeUser(opts: { role?: "NONE" | "ADMIN" | "SUPER_ADMIN" | "FINANCE" | "REVIEWER" } = {}) {
  return prisma.user.create({ data: { email: `u-${uid()}@test.local`, name: "Test User", emailVerifiedAt: new Date(), platformRole: opts.role ?? "NONE", mfaEnabledAt: new Date() } });
}

export async function makeSeller(opts: { verified?: boolean; country?: string; credits?: number; patchType?: "EMBROIDERED" | "PVC"; moq?: number } = {}) {
  const user = await makeUser();
  const tag = uid();
  const org = await prisma.organization.create({
    data: {
      type: "SELLER", name: `Seller ${tag}`, slug: `seller-${tag}`, members: { create: { userId: user.id, role: "OWNER" } }, wallet: { create: { currency: "USD" } },
      sellerProfile: {
        create: {
          legalName: `Seller ${tag} Ltd`, publicSlug: `seller-${tag}`, country: opts.country ?? "PK", contactName: "Owner", email: user.email,
          verificationStatus: opts.verified === false ? "PENDING_REVIEW" : "VERIFIED", shippingCountries: ["US"], backingOptions: ["IRON_ON", "SEW_ON"], borderOptions: ["MERROWED"],
          artworkSupport: true, rushCapable: true, yearsOperating: 6, dailyRfqLimit: 50, maxDailySpendMinor: 100_000,
          capabilities: { create: [{ patchType: opts.patchType ?? "EMBROIDERED", moq: opts.moq ?? 50, weeklyCapacity: 10_000, standardDays: 10, rushDays: 5, priceMinMinor: 50, priceMaxMinor: 400 }] },
        },
      },
    },
    include: { sellerProfile: true },
  });
  if (opts.credits) await prisma.$transaction((tx) => creditWallet(tx, { orgId: org.id, amountMinor: opts.credits!, currency: "USD", type: "ADJUSTMENT", memo: "test", idempotencyKey: `test:${org.id}` }));
  return { user, org, seller: org.sellerProfile! };
}

export function submission(over: Partial<RfqSubmission> = {}): RfqSubmission {
  return {
    patchType: "EMBROIDERED", intendedUse: "CLOTHING_BRAND", unit: "IN", width: 3, height: 3, borderType: "MERROWED", quantity: 500, repeatPotential: false, sampleRequired: false,
    backing: "IRON_ON", colorCount: 4, specialFinishing: [], artworkIds: [], artworkNotes: "Navy and white logo, clean vector available.", destinationCountry: "US", destinationState: "CA",
    destinationPostal: "90012", requiredBy: new Date(Date.now() + 45 * 86_400_000).toISOString().slice(0, 10), rush: false, sampleBeforeProduction: false, budgetUndisclosed: false,
    budgetTotal: 1500, contactName: "Jordan Lee", contactCompany: "North Loop Apparel", contactEmail: `buyer-${uid()}@gmail.com`, contactPhone: "+1 213 555 0100",
    preferredContact: "EMAIL", consentMatching: true, consentSharing: true, disclosureMode: "FULL_CONTACT", consentTerms: true, consentMarketing: false, website2: "",
    ...over,
  } as RfqSubmission;
}

/** Creates a guest RFQ and marks the email verified via the real token path. */
export async function submitVerifiedRfq(over: Partial<RfqSubmission> = {}) {
  const { rfq } = await createRfq(submission(over), { ip: `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });
  const { sha256, randomToken } = await import("@/lib/crypto");
  const token = randomToken();
  await prisma.verificationToken.create({ data: { tokenHash: sha256(token), purpose: "RFQ_EMAIL_VERIFY", email: rfq.contactEmail, data: { rfqId: rfq.id }, expiresAt: new Date(Date.now() + 3_600_000) } });
  const { verifyRfqEmail } = await import("@/lib/domain/rfq");
  await verifyRfqEmail(token);
  return prisma.rfq.findUniqueOrThrow({ where: { id: rfq.id } });
}
