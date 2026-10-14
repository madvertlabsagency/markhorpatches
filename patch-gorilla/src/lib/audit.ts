import "server-only";
import { prisma } from "@/lib/db";
import { clientIp } from "@/lib/request";

export async function audit(actorId: string | null, action: string, entityType: string, entityId?: string | null, diff?: unknown) {
  try {
    await prisma.auditLog.create({
      data: { actorId, action, entityType, entityId: entityId ?? null, diff: diff === undefined ? undefined : JSON.parse(JSON.stringify(diff)), ipAddress: await clientIp().catch(() => null) },
    });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}
