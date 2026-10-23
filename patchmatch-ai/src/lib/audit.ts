import "server-only";
import { prisma } from "@/lib/db";
import { clientIp } from "@/lib/request";
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient | typeof prisma;

/** Append-only audit trail for sensitive actions. Pass `tx` to commit atomically with the change. */
export async function audit(actorId: string | null, action: string, entityType: string, entityId?: string | null, diff?: unknown, tx: Tx = prisma) {
  try {
    await tx.auditLog.create({
      data: {
        actorId, action, entityType, entityId: entityId ?? null,
        diff: diff === undefined ? undefined : JSON.parse(JSON.stringify(diff)),
        ipAddress: await clientIp().catch(() => null),
      },
    });
  } catch (e) {
    if (tx !== prisma) throw e; // inside a transaction, a failed audit must abort the change
    console.error("[audit] failed", e);
  }
}
