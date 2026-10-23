/** Seeds an isolated E2E scenario through the real domain services and writes fixture IDs. */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { prisma } from "../../src/lib/db";
import { createRfq, verifyRfqEmail, processRfq, adminQualifyRfq } from "../../src/lib/domain/rfq";
import { runMatching, publishOpportunity } from "../../src/lib/domain/matching";
import { randomToken, sha256 } from "../../src/lib/crypto";

const run = Date.now().toString(36);
const PASSWORD = "E2ePassword!2026";

async function user(email: string, role: "NONE" | "SUPER_ADMIN" = "NONE") {
  return prisma.user.create({ data: { email, name: "E2E User", passwordHash: await bcrypt.hash(PASSWORD, 10), emailVerifiedAt: new Date(), platformRole: role } });
}

async function seller(tag: string) {
  const u = await user(`seller-${tag}-${run}@e2e.test`);
  const org = await prisma.organization.create({
    data: {
      type: "SELLER", name: `E2E Seller ${tag} ${run}`, slug: `e2e-${tag}-${run}`, members: { create: { userId: u.id, role: "OWNER" } }, wallet: { create: { currency: "USD" } },
      sellerProfile: { create: { legalName: `E2E Seller ${tag} ${run}`, publicSlug: `e2e-${tag}-${run}`, country: "PK", contactName: "E2E", email: u.email, verificationStatus: "VERIFIED", shippingCountries: ["US"], backingOptions: ["IRON_ON"], borderOptions: ["MERROWED"], artworkSupport: true, dailyRfqLimit: 50, maxDailySpendMinor: 100_000, capabilities: { create: [{ patchType: "WOVEN", moq: 10, standardDays: 7, weeklyCapacity: 50_000 }] } } },
    },
    include: { sellerProfile: true },
  });
  return { email: u.email, sellerId: org.sellerProfile!.id };
}

async function main() {
  // Pause every other seller so the scenario is deterministic.
  await prisma.sellerProfile.updateMany({ data: { availability: "PAUSED" } });
  const admin = await user(`admin-${run}@e2e.test`, "SUPER_ADMIN");
  const a = await seller("a");
  const outsider = await seller("b");
  await prisma.sellerProfile.update({ where: { id: outsider.sellerId }, data: { capabilities: { deleteMany: {}, create: [{ patchType: "PVC", moq: 10, standardDays: 7 }] } } });
  const buyerEmail = `buyer-${run}@e2e.test`;
  const buyer = await user(buyerEmail);
  const buyerOrg = await prisma.organization.create({ data: { type: "BUYER", name: "E2E Buyer", slug: `e2e-buyer-${run}`, members: { create: { userId: buyer.id, role: "OWNER" } } } });
  const otherBuyer = await user(`buyer2-${run}@e2e.test`);
  await prisma.organization.create({ data: { type: "BUYER", name: "E2E Buyer 2", slug: `e2e-buyer2-${run}`, members: { create: { userId: otherBuyer.id, role: "OWNER" } } } });

  const { rfq } = await createRfq(
    {
      patchType: "WOVEN", intendedUse: "HATS", unit: "IN", width: 2.5, height: 2, borderType: "MERROWED", quantity: 400, repeatPotential: false, sampleRequired: false, backing: "IRON_ON", colorCount: 3,
      specialFinishing: [], artworkIds: [], artworkNotes: "Cap front patch, navy and white", destinationCountry: "US", destinationState: "WA", destinationPostal: "98101",
      requiredBy: new Date(Date.now() + 50 * 86_400_000).toISOString().slice(0, 10), rush: false, sampleBeforeProduction: false, budgetUndisclosed: true,
      contactName: "Secret Buyer Name", contactCompany: "Hidden Hat Co", contactEmail: buyerEmail, contactPhone: "+1 206 555 0177", preferredContact: "EMAIL",
      consentMatching: true, consentSharing: true, disclosureMode: "FULL_CONTACT", consentDirectContact: true, buyingStage: "WITHIN_30_DAYS", consentTerms: true, consentMarketing: false, website2: "",
    } as never,
    { ip: "203.0.113.9" },
  );
  const token = randomToken();
  await prisma.verificationToken.create({ data: { tokenHash: sha256(token), purpose: "RFQ_EMAIL_VERIFY", email: buyerEmail, data: { rfqId: rfq.id }, expiresAt: new Date(Date.now() + 3_600_000) } });
  await verifyRfqEmail(token);
  await prisma.rfq.update({ where: { id: rfq.id }, data: { buyerOrgId: buyerOrg.id, buyerUserId: buyer.id } });
  await processRfq(rfq.id);
  await adminQualifyRfq(admin.id, rfq.id, { tier: "A", pricingTier: "HIGH_INTENT" });
  await runMatching(rfq.id, admin.id);
  await publishOpportunity(rfq.id, admin.id, { distributionMode: "EXCLUSIVE" });
  await prisma.backgroundJob.deleteMany({});

  writeFileSync("e2e/.fixture.json", JSON.stringify({ password: PASSWORD, admin: admin.email, sellerA: a.email, outsider: outsider.email, buyer: buyerEmail, otherBuyer: otherBuyer.email, rfqId: rfq.id, rfqRef: rfq.publicRef }, null, 2));
  console.log(`[e2e] seeded ${rfq.publicRef}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
