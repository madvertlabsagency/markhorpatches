"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAccessibleOrder } from "@/lib/order-access";
import { approveProof, requestRevision, ProofError } from "@/lib/domain/proofs";
import { clientIp, userAgent } from "@/lib/request";
import { ownerContext } from "@/lib/cart-session";

type R = { ok: true } | { ok: false; error: string };

async function guard(orderId: string, token: string | null, proofId: string) {
  const access = await getAccessibleOrder(orderId, token);
  if (!access) return null;
  const proof = await prisma.proof.findUnique({ where: { id: proofId }, include: { orderItem: true } });
  if (!proof || proof.orderItem.orderId !== orderId) return null;
  return access;
}

export async function approveProofAction(input: { orderId: string; token: string | null; proofId: string; confirmed: boolean }): Promise<R> {
  const access = await guard(input.orderId, input.token, input.proofId);
  if (!access) return { ok: false, error: "We couldn't verify access to this proof." };
  try {
    await approveProof({ proofId: input.proofId, actor: { email: access.actorEmail, customerId: access.customerId }, ipAddress: await clientIp(), userAgent: await userAgent(), confirmed: input.confirmed });
    revalidatePath(`/order/${input.orderId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof ProofError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "We couldn't record your approval. Please try again." };
  }
}

export async function requestRevisionAction(input: { orderId: string; token: string | null; proofId: string; comment: string; artworkFileId?: string | null }): Promise<R> {
  const access = await guard(input.orderId, input.token, input.proofId);
  if (!access) return { ok: false, error: "We couldn't verify access to this proof." };
  try {
    let artworkFileId: string | null = null;
    if (input.artworkFileId) {
      const owner = await ownerContext();
      const f = await prisma.artworkFile.findUnique({ where: { id: input.artworkFileId } });
      if (f && f.status === "UPLOADED" && ((owner.anonOwnerId && f.anonOwnerId === owner.anonOwnerId) || (owner.customerId && f.customerId === owner.customerId))) {
        artworkFileId = f.id;
        if (access.order.customerId) await prisma.artworkFile.update({ where: { id: f.id }, data: { customerId: access.order.customerId } });
      }
    }
    await requestRevision({ proofId: input.proofId, comment: input.comment, artworkFileId, customerId: access.customerId });
    revalidatePath(`/order/${input.orderId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof ProofError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "We couldn't send your revision request. Please try again." };
  }
}
