import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect, forbidden } from "next/navigation";
import { prisma } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { can, isStaff, type Permission } from "./rbac";

const COOKIE = "pg_session";
const TTL_DAYS = 30;

export async function createSession(userId: string, meta: { ip?: string; userAgent?: string | null } = {}) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86_400_000);
  await prisma.session.create({ data: { tokenHash: sha256(token), userId, expiresAt, ipAddress: meta.ip, userAgent: meta.userAgent ?? undefined } });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(COOKIE);
}

/** Current user (or null). Cached per request. */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { customer: true } } },
  });
  if (!session || session.expiresAt < new Date() || session.user.disabled) return null;
  return session.user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(next = "/account") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireCustomer(next = "/account") {
  const user = await requireUser(next);
  const customer =
    user.customer ??
    (await prisma.customer.upsert({ where: { email: user.email }, create: { email: user.email, userId: user.id, firstName: user.name ?? undefined }, update: { userId: user.id } }));
  return { user, customer };
}

export async function requireStaff(permission: Permission = "dashboard:view") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/admin`);
  if (!isStaff(user.role) || !can(user.role, permission)) forbidden();
  return user;
}

/** For server actions: returns the user or throws (never redirects mid-mutation). */
export async function assertStaff(permission: Permission) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role) || !can(user.role, permission)) throw new Error("FORBIDDEN");
  return user;
}
