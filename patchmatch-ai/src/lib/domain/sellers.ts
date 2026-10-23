import "server-only";
import { recordSellerEvent } from "@/lib/activity";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { audit } from "@/lib/audit";
import { alertAdmins, notify, orgUserIds } from "@/lib/notifications";
import { trackEvent } from "@/lib/analytics/events";
import { uniqueSlug } from "@/lib/domain/orgs";
import { DomainError } from "@/lib/domain/rfq";
import { assertTransition, VERIFICATION_TRANSITIONS } from "@/lib/state-machines";
import { toMinor } from "@/lib/money";
import { PATCH_TYPE_VALUES, BACKING_VALUES, BORDER_VALUES } from "@/lib/rfq/schema";
import { CONSENT_VERSION } from "@/lib/rfq/schema";
import { sha256 } from "@/lib/crypto";
import type { VerificationStatus } from "@/generated/prisma/client";

const text = (max: number) => z.string().trim().max(max).optional().or(z.literal("").transform(() => undefined));

export const sellerApplicationSchema = z.object({
  legalName: z.string().trim().min(2, "Enter the legal business name").max(160),
  tradingName: text(160),
  country: z.string().length(2, "Choose a country"),
  addressLine1: text(200),
  city: text(80),
  region: text(80),
  postalCode: text(20),
  contactName: z.string().trim().min(2, "Enter a contact person").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid business email"),
  phone: z.string().trim().min(7, "Enter a phone number").max(32),
  website: text(200),
  registrationNumber: text(80),
  yearsOperating: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(0).max(150).optional()),
  factoryLocation: text(160),
  exportMarkets: z.array(z.string().length(2)).max(40).default([]),
  description: text(1500),
  acceptTerms: z.literal(true, { message: "You must accept the Seller Terms and RFQ Quality Policy." }),
});
export type SellerApplication = z.infer<typeof sellerApplicationSchema>;

export const capabilityRowSchema = z.object({
  patchType: z.enum(PATCH_TYPE_VALUES.filter((p) => p !== "NOT_SURE") as [string, ...string[]]),
  moq: z.preprocess((v) => Number(v), z.number().int().min(1).max(1_000_000)),
  maxQuantity: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(1).optional()),
  weeklyCapacity: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(1).optional()),
  standardDays: z.preprocess((v) => Number(v), z.number().int().min(1).max(180)),
  rushDays: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(1).max(180).optional()),
  priceMin: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().min(0).optional()),
  priceMax: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().min(0).optional()),
});

export const capabilitiesSchema = z.object({
  rows: z.array(capabilityRowSchema).min(1, "Add at least one patch type"),
  backingOptions: z.array(z.enum(BACKING_VALUES)).default([]),
  borderOptions: z.array(z.enum(BORDER_VALUES)).default([]),
  shippingCountries: z.array(z.string().length(2)).min(1, "Choose at least one shipping destination"),
  artworkSupport: z.boolean().default(false),
  sampleCapable: z.boolean().default(false),
  rushCapable: z.boolean().default(false),
});

export const preferencesSchema = z.object({
  availability: z.enum(["ACTIVE", "PAUSED"]),
  dailyRfqLimit: z.preprocess((v) => Number(v), z.number().int().min(1).max(100)),
  maxDailySpend: z.preprocess((v) => Number(v), z.number().min(1).max(5000)),
  minBudget: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().min(0).max(1_000_000).optional()),
  emailOpportunities: z.boolean().default(true),
});

/** Creates the seller organization for a signed-in user. */
export async function createSellerApplication(userId: string, input: SellerApplication) {
  const existing = await prisma.organizationMember.findFirst({ where: { userId, org: { type: "SELLER" } } });
  if (existing) throw new DomainError("EXISTS", "You already have a manufacturer account.");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const name = input.tradingName || input.legalName;
  const slug = await uniqueSlug(name, async (s) => !!(await prisma.organization.findUnique({ where: { slug: s } })));
  const publicSlug = await uniqueSlug(name, async (s) => !!(await prisma.sellerProfile.findUnique({ where: { publicSlug: s } })));
  const org = await prisma.$transaction(async (tx) => {
    const o = await tx.organization.create({
      data: {
        type: "SELLER", name, slug, country: input.country, website: input.website, isDemo: user.isDemo,
        members: { create: { userId, role: "OWNER" } },
        wallet: { create: { currency: "USD" } },
        sellerProfile: {
          create: {
            legalName: input.legalName, tradingName: input.tradingName, publicSlug, country: input.country, addressLine1: input.addressLine1, city: input.city, region: input.region,
            postalCode: input.postalCode, contactName: input.contactName, email: input.email, phone: input.phone, website: input.website, registrationNumber: input.registrationNumber,
            yearsOperating: input.yearsOperating, factoryLocation: input.factoryLocation, exportMarkets: input.exportMarkets, description: input.description,
            verificationStatus: "UNVERIFIED", isDemo: user.isDemo, notificationPrefs: { emailOpportunities: true },
          },
        },
      },
    });
    await tx.consentRecord.create({ data: { kind: "SELLER_TERMS", granted: true, email: user.email, userId, textVersion: CONSENT_VERSION, textHash: sha256("seller-terms+rfq-quality-policy:" + CONSENT_VERSION) } });
    await audit(userId, "seller.apply", "Organization", o.id, { legalName: input.legalName, country: input.country }, tx);
    return o;
  });
  await notify({ userIds: [userId], type: "seller_application", title: "Application received", body: "Add your capabilities and verification documents, then submit for review.", link: "/seller/verification", dedupeKey: `seller_app:${org.id}`, email: { template: "seller_application_received", data: { name: input.contactName.split(" ")[0], company: name, url: siteUrl("/seller/verification") } } });
  await trackEvent("SellerRegistered", { userId, orgId: org.id, props: { country: input.country }, isDemo: user.isDemo });
  return org;
}

export async function saveCapabilities(sellerId: string, userId: string, input: z.infer<typeof capabilitiesSchema>) {
  const types = input.rows.map((r) => r.patchType);
  if (new Set(types).size !== types.length) throw new DomainError("INVALID", "Each patch type can only be listed once.");
  for (const r of input.rows) {
    if (r.maxQuantity && r.maxQuantity < r.moq) throw new DomainError("INVALID", `${r.patchType}: maximum quantity is below the MOQ.`);
    if (r.priceMin !== undefined && r.priceMax !== undefined && r.priceMax < r.priceMin) throw new DomainError("INVALID", `${r.patchType}: price range is inverted.`);
  }
  await prisma.$transaction(async (tx) => {
    await tx.sellerCapability.deleteMany({ where: { sellerId, patchType: { notIn: types as never[] } } });
    for (const r of input.rows) {
      const data = {
        moq: r.moq, maxQuantity: r.maxQuantity ?? null, weeklyCapacity: r.weeklyCapacity ?? null, standardDays: r.standardDays, rushDays: r.rushDays ?? null,
        priceMinMinor: r.priceMin !== undefined ? toMinor(r.priceMin) : null, priceMaxMinor: r.priceMax !== undefined ? toMinor(r.priceMax) : null,
      };
      await tx.sellerCapability.upsert({ where: { sellerId_patchType: { sellerId, patchType: r.patchType as never } }, create: { sellerId, patchType: r.patchType as never, ...data }, update: data });
    }
    await tx.sellerProfile.update({
      where: { id: sellerId },
      data: { backingOptions: input.backingOptions, borderOptions: input.borderOptions, shippingCountries: input.shippingCountries, artworkSupport: input.artworkSupport, sampleCapable: input.sampleCapable, rushCapable: input.rushCapable },
    });
    await audit(userId, "seller.capabilities", "SellerProfile", sellerId, { types }, tx);
  });
}

export async function savePreferences(sellerId: string, userId: string, input: z.infer<typeof preferencesSchema>) {
  await prisma.sellerProfile.update({
    where: { id: sellerId },
    data: {
      availability: input.availability, dailyRfqLimit: input.dailyRfqLimit, maxDailySpendMinor: toMinor(input.maxDailySpend),
      minBudgetMinor: input.minBudget !== undefined ? toMinor(input.minBudget) : null, notificationPrefs: { emailOpportunities: input.emailOpportunities },
    },
  });
  await audit(userId, "seller.preferences", "SellerProfile", sellerId, input);
}

/** Readiness checklist shown to sellers before they can submit for review. */
export async function verificationChecklist(sellerId: string) {
  const s = await prisma.sellerProfile.findUniqueOrThrow({ where: { id: sellerId }, include: { capabilities: true, documents: true, portfolio: true, org: { include: { members: { include: { user: true } } } } } });
  const owner = s.org.members.find((m) => m.role === "OWNER")?.user;
  const items = [
    { key: "email", label: "Account email verified", done: !!owner?.emailVerifiedAt },
    { key: "capabilities", label: "Manufacturing capabilities added", done: s.capabilities.length > 0 && s.shippingCountries.length > 0 },
    { key: "registration", label: "Business registration document uploaded", done: s.documents.some((d) => d.kind === "BUSINESS_REGISTRATION") },
    { key: "factory", label: "At least 2 factory photos uploaded", done: s.documents.filter((d) => d.kind === "FACTORY_PHOTO").length >= 2 },
    { key: "portfolio", label: "At least 3 portfolio samples", done: s.portfolio.length >= 3 },
  ];
  return { items, ready: items.every((i) => i.done), seller: s };
}

export async function submitForVerification(sellerId: string, userId: string) {
  const { ready, seller } = await verificationChecklist(sellerId);
  if (!ready) throw new DomainError("INCOMPLETE", "Complete every checklist item before submitting.");
  await transitionVerification(sellerId, "PENDING_REVIEW", { actorId: userId, reason: "Submitted by seller" });
  await recordSellerEvent("SELLER_APPLIED", sellerId);
  await alertAdmins("New seller verification", `${seller.legalName} (${seller.country}) submitted for verification.`, `/admin/seller-verification/${seller.id}`, `seller_verify:${seller.id}:${Date.now()}`, ["SUPER_ADMIN", "ADMIN", "REVIEWER"]);
}

export async function transitionVerification(sellerId: string, to: VerificationStatus, opts: { actorId: string; reason?: string; requestedInfo?: string; isAdmin?: boolean }) {
  const seller = await prisma.sellerProfile.findUniqueOrThrow({ where: { id: sellerId } });
  assertTransition("verification", VERIFICATION_TRANSITIONS, seller.verificationStatus, to);
  if ((to === "REJECTED" || to === "INFO_REQUIRED" || to === "SUSPENDED") && !opts.reason?.trim()) throw new DomainError("INVALID", "A reason is required.");
  await prisma.$transaction(async (tx) => {
    await tx.sellerProfile.update({ where: { id: sellerId }, data: { verificationStatus: to, verifiedAt: to === "VERIFIED" ? new Date() : seller.verifiedAt, ...(to === "VERIFIED" && opts.isAdmin && !seller.identityVerifiedAt ? { identityVerifiedAt: new Date() } : {}) } });
    await tx.sellerVerification.create({ data: { sellerId, fromStatus: seller.verificationStatus, toStatus: to, reason: opts.reason, requestedInfo: opts.requestedInfo, reviewerId: opts.isAdmin ? opts.actorId : null } });
    if (to === "SUSPENDED" || to === "REJECTED") await tx.rfqReservation.updateMany({ where: { sellerId, status: "ACTIVE" }, data: { status: "RELEASED", releasedReason: `Seller ${to.toLowerCase()}` } });
    if (opts.isAdmin) await audit(opts.actorId, `seller.verification.${to.toLowerCase()}`, "SellerProfile", sellerId, { from: seller.verificationStatus, to, reason: opts.reason }, tx);
  });
  if (opts.isAdmin) {
    const messages: Partial<Record<VerificationStatus, string>> = {
      VERIFIED: "Your business is verified. You can now view and unlock matching RFQs.",
      INFO_REQUIRED: `We need more information: ${opts.requestedInfo ?? opts.reason ?? ""}`,
      REJECTED: `Your application was not approved: ${opts.reason ?? ""}`,
      SUSPENDED: `Your account is suspended: ${opts.reason ?? ""}`,
    };
    const msg = messages[to];
    if (msg) {
      const label = { VERIFIED: "Verified", INFO_REQUIRED: "Additional information required", REJECTED: "Not approved", SUSPENDED: "Suspended" }[to as "VERIFIED"];
      await notify({ userIds: await orgUserIds(seller.orgId), type: "seller_verification", title: `Verification: ${label}`, body: msg, link: "/seller/verification", dedupeKey: `verification:${sellerId}:${to}:${Date.now()}`, email: { template: "seller_verification_decision", data: { company: seller.tradingName ?? seller.legalName, status: label, message: msg, url: siteUrl("/seller/dashboard") } } });
    }
    if (to === "VERIFIED") {
      await trackEvent("SellerVerified", { orgId: seller.orgId, isDemo: seller.isDemo });
      await recordSellerEvent("SELLER_VERIFIED", sellerId);
    }
  }
}
