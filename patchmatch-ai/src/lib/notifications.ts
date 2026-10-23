import "server-only";
import { prisma } from "@/lib/db";
import { enqueue } from "@/lib/jobs/queue";
import { isDemoMode, siteUrl } from "@/lib/env";
import { emailProvider } from "@/lib/services/email/provider";
import { renderTemplate } from "@/lib/services/email/templates";
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient | typeof prisma;

export interface NotifyInput {
  userIds: string[];
  type: string;
  title: string;
  body: string;
  link?: string;
  dedupeKey: string;
  email?: { template: string; data: Record<string, string | number | null | undefined> };
}

/** In-app notification (deduplicated per user) + optional email via the job queue. */
export async function notify(input: NotifyInput, tx: Tx = prisma) {
  const users = await tx.user.findMany({ where: { id: { in: input.userIds }, disabledAt: null }, select: { id: true, email: true } });
  for (const u of users) {
    const key = `${input.dedupeKey}:${u.id}`;
    await tx.notification.upsert({
      where: { dedupeKey: key },
      create: { userId: u.id, type: input.type, title: input.title, body: input.body, link: input.link, dedupeKey: key },
      update: {},
    });
    if (input.email) await queueEmail(u.email, input.email.template, input.email.data, key, tx);
  }
}

/** Reserved/fictional addresses used by demo personas never receive real email. */
export function isSyntheticAddress(email: string) {
  return /@([a-z0-9-]+\.)*(example\.(com|org|net)|patchmatch\.demo)$|\.(example|test|invalid|localhost)$/i.test(email.trim());
}

export async function queueEmail(to: string, template: string, data: Record<string, string | number | null | undefined>, dedupeKey: string, tx: Tx = prisma) {
  // Demo isolation: a demo deployment and synthetic personas never send real email.
  if (isDemoMode() || isSyntheticAddress(to)) return;
  await enqueue("email.send", { to, template, data, dedupeKey }, { dedupeKey: `email:${dedupeKey}`, tx });
}

/** Job handler: renders and sends one email at most once per dedupe key. */
export async function sendEmailJob(payload: Record<string, unknown>) {
  const to = String(payload.to);
  const template = String(payload.template);
  const dedupeKey = String(payload.dedupeKey);
  const data = (payload.data ?? {}) as Record<string, string>;
  const existing = await prisma.notificationDelivery.findUnique({ where: { dedupeKey } });
  if (existing?.status === "SENT") return;
  const delivery = existing ?? (await prisma.notificationDelivery.create({ data: { channel: "EMAIL", template, recipient: to, dedupeKey } }));
  const override = await prisma.notificationTemplate.findUnique({ where: { key_channel: { key: template, channel: "EMAIL" } } });
  const rendered = renderTemplate(template, data, override?.active ? override : null);
  try {
    const res = await emailProvider().send({ to, subject: rendered.subject, html: rendered.html, text: rendered.text, tags: { template } });
    await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "SENT", sentAt: new Date(), providerId: res.id, error: null } });
  } catch (e) {
    await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "FAILED", error: e instanceof Error ? e.message.slice(0, 1000) : String(e) } });
    throw e;
  }
}

/** Staff that should receive operational alerts for a permission area. */
export async function staffUserIds(roles: ("SUPER_ADMIN" | "ADMIN" | "REVIEWER" | "FINANCE" | "SUPPORT")[] = ["SUPER_ADMIN", "ADMIN"]) {
  const staff = await prisma.user.findMany({ where: { platformRole: { in: roles }, disabledAt: null }, select: { id: true } });
  return staff.map((s) => s.id);
}

export async function alertAdmins(title: string, message: string, link: string, dedupeKey: string, roles?: Parameters<typeof staffUserIds>[0]) {
  const ids = await staffUserIds(roles);
  await notify({ userIds: ids, type: "admin_alert", title, body: message, link, dedupeKey, email: process.env.OPS_ALERT_EMAILS === "true" ? { template: "admin_alert", data: { title, message, url: siteUrl(link) } } : undefined });
}

export async function orgUserIds(orgId: string) {
  const members = await prisma.organizationMember.findMany({ where: { orgId }, select: { userId: true } });
  return members.map((m) => m.userId);
}
