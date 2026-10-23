"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getSession, markSessionMfaVerified, revokeAllSessions, requireUser } from "@/lib/auth/session";
import { decrypt, encrypt, randomToken, sha256 } from "@/lib/crypto";
import { generateTotpSecret, verifyTotp } from "@/lib/auth/totp";
import { siteUrl } from "@/lib/env";
import { queueEmail } from "@/lib/notifications";
import { ensureBuyerOrg } from "@/lib/domain/orgs";
import { audit } from "@/lib/audit";
import { clientIp, userAgent } from "@/lib/request";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { guard, str, toActionError } from "@/lib/actions";
import { isStaff } from "@/lib/auth/rbac";
import type { ActionState } from "@/lib/action-state";

const passwordSchema = z.string().min(10, "Use at least 10 characters").max(128).regex(/[A-Za-z]/, "Include a letter").regex(/[0-9]/, "Include a number");

function safeNext(next: string | null | undefined, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

async function sendVerification(userId: string, email: string, name: string | null) {
  const token = randomToken();
  await prisma.verificationToken.create({ data: { tokenHash: sha256(token), purpose: "EMAIL_VERIFY", userId, email, expiresAt: new Date(Date.now() + 48 * 3_600_000) } });
  await queueEmail(email, "email_verify", { name: name?.split(" ")[0] ?? "there", url: siteUrl(`/verify-email?token=${token}`) }, `email_verify:${userId}:${Date.now()}`);
}

export async function registerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const limited = await guard("register", 5, 15 * 60_000);
  if (limited) return limited;
  try {
    const data = z
      .object({
        name: z.string().trim().min(2, "Enter your name").max(120),
        email: z.string().trim().toLowerCase().email("Enter a valid email"),
        password: passwordSchema,
        role: z.enum(["buyer", "seller"]).default("buyer"),
        terms: z.literal("on", { message: "Please accept the terms" }),
      })
      .parse({ name: str(fd, "name"), email: str(fd, "email"), password: fd.get("password"), role: str(fd, "role") || "buyer", terms: fd.get("terms") });
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return { ok: false, error: "An account with this email already exists. Sign in or reset your password." };
    const user = await prisma.user.create({ data: { email: data.email, name: data.name, passwordHash: await hashPassword(data.password) } });
    if (data.role === "buyer") await ensureBuyerOrg(user.id);
    await sendVerification(user.id, user.email, user.name);
    await createSession(user.id, { ip: await clientIp(), userAgent: await userAgent() });
    await audit(user.id, "user.register", "User", user.id, { role: data.role });
  } catch (e) {
    return toActionError(e);
  }
  const role = str(fd, "role");
  redirect(role === "seller" ? "/become-a-seller/apply" : safeNext(str(fd, "next"), "/buyer/dashboard"));
}

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").toLowerCase();
  const ip = await clientIp();
  const rl = rateLimit(`login:${ip}:${email}`, LIMITS.login.limit, LIMITS.login.windowMs);
  if (!rl.ok) return { ok: false, error: "Too many sign-in attempts. Try again in 15 minutes." };
  const user = await prisma.user.findUnique({ where: { email }, include: { memberships: { include: { org: true } } } });
  const password = String(fd.get("password") ?? "");
  // Constant-ish time: always run bcrypt.
  const ok = await verifyPassword(password, user?.passwordHash ?? "$2b$12$DuOJ6IAav04YaT21lE9PEewHNYE43MWx8f/N9auim1ER.VebHILny");
  if (!user || !user.passwordHash || !ok || user.disabledAt) {
    await audit(user?.id ?? null, "auth.login_failed", "User", user?.id, { email });
    return { ok: false, error: "Incorrect email or password." };
  }
  await createSession(user.id, { ip, userAgent: await userAgent() });
  await audit(user.id, "auth.login", "User", user.id);
  const fallback = isStaff(user.platformRole) ? "/admin" : user.memberships.some((m) => m.org.type === "SELLER") ? "/seller/dashboard" : "/buyer/dashboard";
  const next = safeNext(str(fd, "next"), fallback);
  if (user.mfaEnabledAt) redirect(`/login/mfa?next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function mfaChallengeAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) redirect("/login");
  const ip = await clientIp();
  const rl = rateLimit(`mfa:${session.userId}:${ip}`, 6, 10 * 60_000);
  if (!rl.ok) return { ok: false, error: "Too many attempts. Wait 10 minutes." };
  const user = session.user;
  if (!user.mfaSecretEnc) return { ok: false, error: "Two-factor authentication is not set up." };
  const code = str(fd, "code").replace(/\s/g, "");
  let valid = verifyTotp(decrypt(user.mfaSecretEnc), code);
  if (!valid && code.length >= 8) {
    const hash = sha256(code.toUpperCase());
    if (user.mfaRecoveryHashes.includes(hash)) {
      valid = true;
      await prisma.user.update({ where: { id: user.id }, data: { mfaRecoveryHashes: user.mfaRecoveryHashes.filter((h) => h !== hash) } });
      await audit(user.id, "auth.mfa_recovery_code_used", "User", user.id);
    }
  }
  if (!valid) {
    await audit(user.id, "auth.mfa_failed", "User", user.id);
    return { ok: false, error: "That code isn't valid. Check your authenticator app and try again." };
  }
  await markSessionMfaVerified();
  await audit(user.id, "auth.mfa_verified", "User", user.id);
  redirect(safeNext(str(fd, "next"), "/admin"));
}

export async function beginMfaSetupAction(): Promise<ActionState> {
  const user = await requireUser("/account/security");
  if (user.mfaEnabledAt) return { ok: false, error: "Two-factor authentication is already on." };
  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: user.id }, data: { mfaSecretEnc: encrypt(secret) } });
  return { ok: true, data: { secret } };
}

export async function confirmMfaSetupAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("/account/security");
  if (!user.mfaSecretEnc) return { ok: false, error: "Start setup first." };
  if (!verifyTotp(decrypt(user.mfaSecretEnc), str(fd, "code"))) return { ok: false, error: "That code isn't valid. Make sure your device clock is correct." };
  const codes = Array.from({ length: 8 }, () => randomToken(6).replace(/[^A-Za-z0-9]/g, "").slice(0, 10).toUpperCase().padEnd(10, "X"));
  await prisma.user.update({ where: { id: user.id }, data: { mfaEnabledAt: new Date(), mfaRecoveryHashes: codes.map((c) => sha256(c)) } });
  await markSessionMfaVerified();
  await audit(user.id, "auth.mfa_enabled", "User", user.id);
  return { ok: true, message: "Two-factor authentication is on.", data: { recoveryCodes: codes } };
}

export async function disableMfaAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("/account/security");
  if (isStaff(user.platformRole)) return { ok: false, error: "Staff accounts must keep two-factor authentication on." };
  if (!user.passwordHash || !(await verifyPassword(String(fd.get("password") ?? ""), user.passwordHash))) return { ok: false, error: "Incorrect password." };
  await prisma.user.update({ where: { id: user.id }, data: { mfaEnabledAt: null, mfaSecretEnc: null, mfaRecoveryHashes: [] } });
  await audit(user.id, "auth.mfa_disabled", "User", user.id);
  return { ok: true, message: "Two-factor authentication turned off." };
}

export async function verifyEmailToken(token: string) {
  const vt = await prisma.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!vt || vt.purpose !== "EMAIL_VERIFY" || !vt.userId) return { ok: false as const, reason: "This link is invalid." };
  if (vt.usedAt) return { ok: true as const, already: true };
  if (vt.expiresAt < new Date()) return { ok: false as const, reason: "This link has expired. Sign in to request a new one." };
  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: vt.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: vt.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
  // Adopt guest RFQs with this verified email.
  const org = await prisma.organizationMember.findFirst({ where: { userId: vt.userId, org: { type: "BUYER" } } });
  if (org) await prisma.rfq.updateMany({ where: { contactEmail: vt.email, buyerOrgId: null, emailVerifiedAt: { not: null } }, data: { buyerOrgId: org.orgId, buyerUserId: vt.userId } });
  return { ok: true as const, already: false };
}

export async function resendVerificationAction(): Promise<ActionState> {
  const limited = await guard("resend-verify", 3, 15 * 60_000);
  if (limited) return limited;
  const user = await requireUser();
  if (user.emailVerifiedAt) return { ok: true, message: "Your email is already verified." };
  await sendVerification(user.id, user.email, user.name);
  return { ok: true, message: "Verification email sent." };
}

export async function forgotPasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const limited = await guard("forgot", 5, 15 * 60_000);
  if (limited) return limited;
  const email = str(fd, "email").toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.disabledAt) {
    const token = randomToken();
    await prisma.verificationToken.create({ data: { tokenHash: sha256(token), purpose: "PASSWORD_RESET", userId: user.id, email, expiresAt: new Date(Date.now() + 3_600_000) } });
    await queueEmail(email, "password_reset", { url: siteUrl(`/reset-password?token=${token}`) }, `reset:${user.id}:${Date.now()}`);
  }
  // Same response either way (no account enumeration).
  return { ok: true, message: "If an account exists for that email, a reset link is on its way." };
}

export async function resetPasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const password = passwordSchema.parse(fd.get("password"));
    if (password !== fd.get("confirm")) return { ok: false, error: "Passwords don't match." };
    const vt = await prisma.verificationToken.findUnique({ where: { tokenHash: sha256(str(fd, "token")) } });
    if (!vt || vt.purpose !== "PASSWORD_RESET" || vt.usedAt || vt.expiresAt < new Date() || !vt.userId) return { ok: false, error: "This reset link is invalid or has expired." };
    await prisma.$transaction([
      prisma.verificationToken.update({ where: { id: vt.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: vt.userId }, data: { passwordHash: await hashPassword(password), emailVerifiedAt: new Date() } }),
    ]);
    await revokeAllSessions(vt.userId);
    await audit(vt.userId, "auth.password_reset", "User", vt.userId);
  } catch (e) {
    return toActionError(e);
  }
  redirect("/login?reset=1");
}

export async function changePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    if (user.passwordHash && !(await verifyPassword(String(fd.get("current") ?? ""), user.passwordHash))) return { ok: false, error: "Current password is incorrect." };
    const password = passwordSchema.parse(fd.get("password"));
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
    await prisma.session.deleteMany({ where: { userId: user.id, tokenHash: { not: (await getSession())!.tokenHash } } });
    await audit(user.id, "auth.password_changed", "User", user.id);
    return { ok: true, message: "Password updated. Other sessions were signed out." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateProfileAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const data = z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().max(32).optional() }).parse({ name: str(fd, "name"), phone: str(fd, "phone") || undefined });
    await prisma.user.update({ where: { id: user.id }, data });
    return { ok: true, message: "Profile saved." };
  } catch (e) {
    return toActionError(e);
  }
}
