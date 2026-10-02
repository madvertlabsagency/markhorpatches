import "server-only";
import { prisma } from "@/lib/db";
import { ghlAdapter } from "./ghl";
import type { CrmAdapter, CrmEventPayload } from "./types";

export const crm: CrmAdapter = ghlAdapter;

const MAX_ATTEMPTS = 6;
const backoffMs = (attempt: number) => Math.min(2 ** attempt * 60_000, 6 * 3_600_000); // 2m,4m,8m… max 6h

/**
 * Enqueue a CRM event (outbox pattern). Duplicate idempotency keys are ignored,
 * so retries / double submits never create duplicate contacts or opportunities.
 */
export async function enqueueCrmEvent(idempotencyKey: string, event: CrmEventPayload, opts: { leadId?: string; processNow?: boolean } = {}) {
  if (!crm.enabled) return;
  try {
    const row = await prisma.cRMEvent.create({
      data: { type: event.type, idempotencyKey, email: event.contact.email, leadId: opts.leadId, orderId: event.orderId, payload: event as object },
    });
    if (opts.processNow !== false) await processCrmEvent(row.id);
  } catch (e) {
    if ((e as { code?: string }).code !== "P2002") console.error("[crm] enqueue failed", e);
  }
}

export async function processCrmEvent(id: string) {
  const claimed = await prisma.cRMEvent.updateMany({ where: { id, status: { in: ["PENDING", "FAILED"] } }, data: { status: "PROCESSING" } });
  if (!claimed.count) return;
  const row = await prisma.cRMEvent.findUniqueOrThrow({ where: { id } });
  const event = row.payload as unknown as CrmEventPayload;
  try {
    const order = row.orderId ? await prisma.order.findUnique({ where: { id: row.orderId }, select: { crmOpportunityId: true } }) : null;
    const result = await crm.deliver(event, { existingOpportunityId: order?.crmOpportunityId });
    await prisma.cRMEvent.update({ where: { id }, data: { status: "SENT", processedAt: new Date(), attempts: { increment: 1 }, lastError: null } });
    if (row.orderId && result.opportunityId && !order?.crmOpportunityId) await prisma.order.update({ where: { id: row.orderId }, data: { crmOpportunityId: result.opportunityId } });
    if (result.contactId) await prisma.customer.updateMany({ where: { email: row.email }, data: { crmContactId: result.contactId } });
  } catch (e) {
    const attempts = row.attempts + 1;
    await prisma.cRMEvent.update({
      where: { id },
      data: {
        status: attempts >= MAX_ATTEMPTS ? "DEAD" : "FAILED",
        attempts,
        lastError: (e instanceof Error ? e.message : String(e)).slice(0, 1000),
        nextAttemptAt: new Date(Date.now() + backoffMs(attempts)),
      },
    });
  }
}

/** Retry worker — call from /api/cron/crm or `npm run jobs:crm-retry`. */
export async function processCrmQueue(limit = 50) {
  const due = await prisma.cRMEvent.findMany({
    where: { status: { in: ["PENDING", "FAILED"] }, nextAttemptAt: { lte: new Date() } },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
    select: { id: true },
  });
  for (const { id } of due) await processCrmEvent(id);
  return due.length;
}

export type { CrmEventPayload };
