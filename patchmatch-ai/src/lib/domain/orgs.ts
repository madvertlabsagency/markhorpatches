import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient | typeof prisma;

export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>) {
  const root = slugify(base) || "org";
  if (!(await exists(root))) return root;
  for (let i = 0; i < 5; i++) {
    const s = `${root}-${randomBytes(3).toString("hex")}`;
    if (!(await exists(s))) return s;
  }
  return `${root}-${randomBytes(6).toString("hex")}`;
}

/** Every buyer gets a personal buyer organization so RFQs, artwork and team access are org-scoped. */
export async function ensureBuyerOrg(userId: string, tx: Tx = prisma) {
  const existing = await tx.organizationMember.findFirst({ where: { userId, org: { type: "BUYER" } }, include: { org: true } });
  if (existing) return existing.org;
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  const name = user.name ? `${user.name}'s workspace` : user.email.split("@")[0];
  const slug = await uniqueSlug(`buyer-${name}`, async (s) => !!(await tx.organization.findUnique({ where: { slug: s } })));
  const org = await tx.organization.create({
    data: { type: "BUYER", name, slug, isDemo: user.isDemo, members: { create: { userId, role: "OWNER" } }, buyerProfile: { create: { phone: user.phone } } },
  });
  // Adopt guest RFQs submitted with this (verified) email.
  if (user.emailVerifiedAt) {
    await tx.rfq.updateMany({ where: { contactEmail: user.email, buyerOrgId: null, emailVerifiedAt: { not: null } }, data: { buyerOrgId: org.id, buyerUserId: userId } });
  }
  return org;
}
