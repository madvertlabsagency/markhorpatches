"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isStaff } from "@/lib/auth/rbac";
import { sendTemplatedEmail } from "@/lib/services/email";
import { signPayload, verifyPayload, randomToken } from "@/lib/crypto";
import { siteUrl } from "@/lib/env";
import { clientIp, userAgent } from "@/lib/request";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { currentCart } from "@/lib/cart-session";
import { attachCartToCustomer } from "@/lib/domain/cart";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; success?: string } | undefined;

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : null;
};

const passwordSchema = z.string().min(10, "Use at least 10 characters").max(200);

async function sendVerification(user: { id: string; email: string; name: string | null }) {
  const token = signPayload({ purpose: "verify", uid: user.id, email: user.email }, 48 * 3600);
  await sendTemplatedEmail({ template: "verify_email", to: user.email, idempotencyKey: `verify:${user.id}:${randomToken(6)}`, data: { firstName: user.name, url: siteUrl(`/verify-email?token=${encodeURIComponent(token)}`) } });
}

/** Link the customer record (orders, artwork) only AFTER the email is verified — prevents account takeover by registering someone else's email. */
async function linkCustomer(userId: string, email: string) {
  const customer = await prisma.customer.upsert({ where: { email }, create: { email, userId }, update: { userId } });
  const cart = await currentCart();
  if (cart) await attachCartToCustomer(cart.id, customer.id);
  return customer;
}

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const ip = await clientIp();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const rl = rateLimit(`login:${ip}:${email}`, LIMITS.login.limit, LIMITS.login.windowMs);
  if (!rl.ok) return { error: "Too many sign-in attempts. Please wait 15 minutes and try again." };
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user?.passwordHash && !user.disabled ? await verifyPassword(String(fd.get("password") ?? ""), user.passwordHash) : false;
  if (!user || !ok) return { error: "That email and password don't match." };
  await createSession(user.id, { ip, userAgent: await userAgent() });
  if (user.emailVerified) await linkCustomer(user.id, user.email);
  redirect(safeNext(fd.get("next")) ?? (isStaff(user.role) ? "/admin" : "/account"));
}

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  const rl = rateLimit(`register:${await clientIp()}`, LIMITS.form.limit, LIMITS.form.windowMs);
  if (!rl.ok) return { error: "Too many attempts. Please try again later." };
  const parsed = z.object({ name: z.string().trim().min(1, "Tell us your name").max(120), email: z.string().trim().toLowerCase().email("Enter a valid email"), password: passwordSchema }).safeParse({
    name: fd.get("name"), email: fd.get("email"), password: fd.get("password"),
  });
  if (!parsed.success) return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "An account with that email already exists. Try signing in or resetting your password." };
  const user = await prisma.user.create({ data: { email: parsed.data.email, name: parsed.data.name, passwordHash: await hashPassword(parsed.data.password) } });
  await sendVerification(user);
  await createSession(user.id, { ip: await clientIp(), userAgent: await userAgent() });
  redirect(`/account?welcome=1${safeNext(fd.get("next")) ? `&next=${encodeURIComponent(safeNext(fd.get("next"))!)}` : ""}`);
}

export async function resendVerificationAction(): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };
  const rl = rateLimit(`verify:${user.id}`, 3, 60 * 60_000);
  if (!rl.ok) return { error: "We've sent a few already — check your spam folder." };
  await sendVerification(user);
  return { success: "Verification email sent." };
}

export async function verifyEmailToken(token: string) {
  const data = verifyPayload<{ purpose: string; uid: string; email: string }>(token);
  if (!data || data.purpose !== "verify") return false;
  const user = await prisma.user.findUnique({ where: { id: data.uid } });
  if (!user || user.email !== data.email) return false;
  if (!user.emailVerified) await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  await prisma.customer.upsert({ where: { email: user.email }, create: { email: user.email, userId: user.id, firstName: user.name }, update: { userId: user.id } });
  return true;
}

export async function forgotPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const rl = rateLimit(`forgot:${await clientIp()}`, 5, 15 * 60_000);
  if (!rl.ok) return { error: "Too many requests. Please try again later." };
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user?.passwordHash && !user.disabled) {
    const token = signPayload({ purpose: "reset", uid: user.id, ph: user.passwordHash.slice(-12) }, 3600);
    await sendTemplatedEmail({ template: "password_reset", to: user.email, idempotencyKey: `reset:${user.id}:${randomToken(6)}`, data: { firstName: user.name, url: siteUrl(`/reset-password?token=${encodeURIComponent(token)}`) } });
  }
  return { success: "If an account exists for that email, a reset link is on its way." }; // never reveal whether the email exists
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const data = verifyPayload<{ purpose: string; uid: string; ph: string }>(String(fd.get("token") ?? ""));
  if (!data || data.purpose !== "reset") return { error: "This reset link has expired. Please request a new one." };
  const pw = passwordSchema.safeParse(fd.get("password"));
  if (!pw.success) return { fieldErrors: { password: pw.error.issues[0].message } };
  const user = await prisma.user.findUnique({ where: { id: data.uid } });
  if (!user?.passwordHash || user.passwordHash.slice(-12) !== data.ph) return { error: "This reset link has already been used." };
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(pw.data), emailVerified: user.emailVerified ?? new Date() } });
  await prisma.session.deleteMany({ where: { userId: user.id } });
  redirect("/login?reset=1");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function updateProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };
  const parsed = z.object({ firstName: z.string().trim().max(80), lastName: z.string().trim().max(80), phone: z.string().trim().max(30), company: z.string().trim().max(120), marketingConsent: z.boolean() }).safeParse({
    firstName: fd.get("firstName") ?? "", lastName: fd.get("lastName") ?? "", phone: fd.get("phone") ?? "", company: fd.get("company") ?? "", marketingConsent: fd.get("marketingConsent") === "on",
  });
  if (!parsed.success) return { error: "Please check your details." };
  if (!user.emailVerified) return { error: "Please verify your email first." };
  await prisma.customer.upsert({ where: { email: user.email }, create: { email: user.email, userId: user.id, ...parsed.data }, update: parsed.data });
  await prisma.user.update({ where: { id: user.id }, data: { name: `${parsed.data.firstName} ${parsed.data.lastName}`.trim() || user.name } });
  return { success: "Profile saved." };
}

export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user?.passwordHash) return { error: "Please sign in." };
  if (!(await verifyPassword(String(fd.get("current") ?? ""), user.passwordHash))) return { fieldErrors: { current: "Current password is incorrect." } };
  const pw = passwordSchema.safeParse(fd.get("password"));
  if (!pw.success) return { fieldErrors: { password: pw.error.issues[0].message } };
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(pw.data) } });
  return { success: "Password updated." };
}

export async function addressAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user?.customer || !user.emailVerified) return { error: "Please verify your email first." };
  const id = String(fd.get("id") ?? "");
  if (fd.get("delete") === "1" && id) {
    await prisma.address.deleteMany({ where: { id, customerId: user.customer.id } });
    return { success: "Address removed." };
  }
  const { addressInput } = await import("@/lib/configurator/schema");
  const parsed = addressInput.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const isDefault = fd.get("isDefault") === "on";
  if (isDefault) await prisma.address.updateMany({ where: { customerId: user.customer.id }, data: { isDefault: false } });
  await prisma.address.create({ data: { ...parsed.data, company: parsed.data.company || null, line2: parsed.data.line2 || null, phone: parsed.data.phone || null, customerId: user.customer.id, isDefault } });
  return { success: "Address saved." };
}
