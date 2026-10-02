import "server-only";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { emailProvider } from "./provider";
import { renderEmail, type EmailData, type EmailTemplateName } from "./templates";

/**
 * Sends a templated email exactly once per idempotency key.
 * Never throws — email failure must not break checkout or proof flows.
 */
export async function sendTemplatedEmail(opts: { template: EmailTemplateName; to: string; data: EmailData; idempotencyKey: string; orderId?: string }) {
  const provider = emailProvider();
  const rendered = renderEmail(opts.template, opts.data, siteUrl());
  let eventId: string;
  try {
    const ev = await prisma.emailEvent.create({
      data: { template: opts.template, to: opts.to, subject: rendered.subject, provider: provider.name, idempotencyKey: opts.idempotencyKey, orderId: opts.orderId },
    });
    eventId = ev.id;
  } catch {
    return { skipped: true as const }; // duplicate key → already sent/queued
  }
  try {
    const { id } = await provider.send({ to: opts.to, subject: rendered.subject, html: rendered.html, text: rendered.text, tags: { template: opts.template } });
    await prisma.emailEvent.update({ where: { id: eventId }, data: { status: "SENT", providerMessageId: id } });
    return { sent: true as const };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[email] send failed", opts.template, error);
    await prisma.emailEvent.update({ where: { id: eventId }, data: { status: "FAILED", error: error.slice(0, 1000) } });
    return { failed: true as const };
  }
}

export { renderEmail };
export type { EmailTemplateName, EmailData };
