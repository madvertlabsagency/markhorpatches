"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, membershipOf } from "@/lib/auth/session";
import { updateProjectStatus } from "@/lib/domain/projects";
import { DomainError } from "@/lib/domain/rfq";
import { toActionError } from "@/lib/actions";
import type { ActionState } from "@/lib/action-state";

export async function projectStatusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new DomainError("AUTH", "Please sign in.");
    const d = z.object({ rfqId: z.string().uuid(), side: z.enum(["buyer", "seller"]), status: z.enum(["PROOF_APPROVED", "SAMPLE", "IN_PRODUCTION", "SHIPPED", "DELIVERED", "CANCELLED"]), note: z.string().max(500).optional() }).parse(Object.fromEntries(fd));
    const project = await prisma.project.findUnique({ where: { rfqId: d.rfqId }, include: { rfq: true } });
    if (!project) throw new DomainError("NOT_FOUND", "Project not found.");
    if (d.side === "buyer") {
      const owns = project.rfq.buyerUserId === user.id || user.memberships.some((m) => m.orgId === project.rfq.buyerOrgId);
      if (!owns) throw new DomainError("NOT_FOUND", "Project not found.");
    } else if (membershipOf(user, "SELLER")?.org.sellerProfile?.id !== project.sellerId) {
      throw new DomainError("NOT_FOUND", "Project not found.");
    }
    await updateProjectStatus({ rfqId: d.rfqId, status: d.status, note: d.note || undefined, actorId: user.id, side: d.side === "buyer" ? "BUYER" : "SELLER" });
    revalidatePath(d.side === "buyer" ? `/buyer/rfqs/${d.rfqId}` : `/seller/opportunities/${d.rfqId}`);
    return { ok: true, message: "Status updated." };
  } catch (e) {
    return toActionError(e);
  }
}
