import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect, forbidden } from "next/navigation";
import { prisma } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { adminMfaRequired } from "@/lib/env";
import { can, isStaff, orgCan, type OrgAction, type Permission } from "./rbac";

export const SESSION_COOKIE = "pm_session";
const TTL_DAYS = 14;
const ADMIN_IDLE_HOURS = 12;

export class AuthError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN" | "MFA_REQUIRED" | "NOT_VERIFIED", message?: string) {
    super(message ?? code);
  }
}

export async function createSession(userId: string, meta: { ip?: string; userAgent?: string | null; mfaVerified?: boolean } = {}) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86_400_000);
  await prisma.session.create({
    data: { tokenHash: sha256(token), userId, expiresAt, ipAddress: meta.ip, userAgent: meta.userAgent ?? undefined, mfaVerifiedAt: meta.mfaVerified ? new Date() : null },
  });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Revoke every session for a user (password reset, role change, disable). */
export async function revokeAllSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

export const getSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { memberships: { include: { org: { include: { sellerProfile: true } } } } } } },
  });
  if (!session || session.expiresAt < new Date() || session.user.disabledAt) return null;
  return session;
});

/** Current user (or null). Cached per request. */
export const getCurrentUser = cache(async () => (await getSession())?.user ?? null);

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function markSessionMfaVerified() {
  const s = await getSession();
  if (s) await prisma.session.update({ where: { id: s.id }, data: { mfaVerifiedAt: new Date() } });
}

export async function requireUser(next = "/") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export function membershipOf(user: CurrentUser, type: "BUYER" | "SELLER") {
  return user.memberships.find((m) => m.org.type === type) ?? null;
}

/** Buyer area: signed-in user with (or lazily given) a buyer organization. */
export async function requireBuyer(next = "/buyer/dashboard") {
  const user = await requireUser(next);
  let m = membershipOf(user, "BUYER");
  if (!m) {
    const { ensureBuyerOrg } = await import("@/lib/domain/orgs");
    await ensureBuyerOrg(user.id);
    redirect(next);
  }
  m = m!;
  return { user, org: m.org, role: m.role };
}

/** Seller area: signed-in user that belongs to a seller organization. */
export async function requireSeller(next = "/seller/dashboard") {
  const user = await requireUser(next);
  const m = membershipOf(user, "SELLER");
  if (!m || !m.org.sellerProfile) redirect("/become-a-seller/apply");
  return { user, org: m.org, seller: m.org.sellerProfile!, role: m.role };
}

/** Admin pages: staff role + permission + MFA (when required). */
export async function requireAdmin(permission: Permission = "admin:view") {
  const session = await getSession();
  if (!session) redirect(`/login?next=/admin`);
  const user = session.user;
  if (!isStaff(user.platformRole)) forbidden();
  if (adminMfaRequired()) {
    if (!user.mfaEnabledAt) redirect("/account/security?mfa=required");
    if (!session.mfaVerifiedAt) redirect(`/login/mfa?next=/admin`);
  }
  if (Date.now() - session.createdAt.getTime() > ADMIN_IDLE_HOURS * 3_600_000 && adminMfaRequired()) {
    await destroySession();
    redirect(`/login?next=/admin&reason=expired`);
  }
  const grants = await prisma.roleGrant.findMany({ where: { userId: user.id }, select: { permission: true } });
  if (!can(user.platformRole, permission, grants.map((g) => g.permission))) forbidden();
  return user;
}

/** For server actions/route handlers: returns the admin or throws (never redirects mid-mutation). */
export async function assertAdmin(permission: Permission) {
  const session = await getSession();
  if (!session) throw new AuthError("UNAUTHENTICATED");
  const user = session.user;
  if (adminMfaRequired() && (!user.mfaEnabledAt || !session.mfaVerifiedAt)) throw new AuthError("MFA_REQUIRED");
  const grants = await prisma.roleGrant.findMany({ where: { userId: user.id }, select: { permission: true } });
  if (!isStaff(user.platformRole) || !can(user.platformRole, permission, grants.map((g) => g.permission))) throw new AuthError("FORBIDDEN");
  return user;
}

export async function assertSeller(action: OrgAction = "org:read") {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  const m = membershipOf(user, "SELLER");
  if (!m || !m.org.sellerProfile) throw new AuthError("FORBIDDEN", "Seller account required.");
  if (!orgCan(m.role, action)) throw new AuthError("FORBIDDEN", "Your team role does not allow this action.");
  return { user, org: m.org, seller: m.org.sellerProfile, role: m.role };
}

export async function assertBuyer() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  const m = membershipOf(user, "BUYER");
  if (!m) throw new AuthError("FORBIDDEN", "Buyer account required.");
  return { user, org: m.org, role: m.role };
}
