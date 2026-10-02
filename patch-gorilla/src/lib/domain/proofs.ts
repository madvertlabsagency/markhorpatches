import "server-only";
import { prisma } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { emit } from "@/lib/events";
import { configurationInclude, describeConfiguration } from "./configurations";
import { allProofsApproved, OrderError, transitionOrder } from "./orders";

export const APPROVAL_STATEMENT =
  "I confirm the artwork, dimensions, colors, spelling and production specifications shown above.";

export class ProofError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProofError";
  }
}

export function proofContentHash(p: { fileKey: string; version: number; specSnapshot: unknown; orderItemId: string }) {
  return sha256(JSON.stringify({ f: p.fileKey, v: p.version, i: p.orderItemId, s: p.specSnapshot }));
}

/** Staff uploads a new proof version. Previous un-approved versions are superseded; approved versions are never touched. */
export async function createProofVersion(input: { orderItemId: string; fileKey: string; fileMimeType: string; designerNotes?: string | null; uploadedById: string; send: boolean }) {
  const item = await prisma.orderItem.findUniqueOrThrow({
    where: { id: input.orderItemId },
    include: { order: true, configuration: { include: configurationInclude }, proofs: { orderBy: { version: "desc" } } },
  });
  if (["CANCELLED", "REFUNDED", "SHIPPED", "DELIVERED", "IN_PRODUCTION", "QUALITY_CHECK"].includes(item.order.status))
    throw new ProofError("Proofs can't be changed once an order is in production.");

  const version = (item.proofs[0]?.version ?? 0) + 1;
  const spec = { ...describeConfiguration(item.configuration), unitPriceCents: item.unitPriceCents, totalCents: item.totalCents, orderNumber: item.order.orderNumber };

  const proof = await prisma.$transaction(async (tx) => {
    await tx.proof.updateMany({ where: { orderItemId: item.id, status: { in: ["DRAFT", "SENT", "REVISION_REQUESTED"] }, locked: false }, data: { status: "SUPERSEDED" } });
    return tx.proof.create({
      data: {
        orderItemId: item.id, version, fileKey: input.fileKey, fileMimeType: input.fileMimeType, specSnapshot: spec,
        designerNotes: input.designerNotes || null, uploadedById: input.uploadedById, status: input.send ? "SENT" : "DRAFT", sentAt: input.send ? new Date() : null,
      },
    });
  });
  if (input.send) await afterProofSent(proof.id);
  return proof;
}

export async function sendProof(proofId: string) {
  const proof = await prisma.proof.findUniqueOrThrow({ where: { id: proofId } });
  if (proof.status !== "DRAFT") throw new ProofError("Only draft proofs can be sent.");
  await prisma.proof.update({ where: { id: proofId }, data: { status: "SENT", sentAt: new Date() } });
  await afterProofSent(proofId);
}

async function afterProofSent(proofId: string) {
  const proof = await prisma.proof.findUniqueOrThrow({ where: { id: proofId }, include: { orderItem: { include: { order: true } } } });
  const order = proof.orderItem.order;
  if (order.status === "PAID") await transitionOrder(order.id, "MOCKUP_PENDING", { silent: true, note: "Artwork review" });
  const fresh = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  if (["MOCKUP_PENDING", "REVISION_REQUESTED", "PROOF_APPROVED"].includes(fresh.status) || (fresh.status === "PAYMENT_PENDING" && fresh.source !== "CHECKOUT")) {
    await transitionOrder(order.id, "PROOF_READY", { silent: true, note: `Proof V${proof.version} ready` });
  }
  await emit({ type: "proof.sent", proofId });
}

async function latestProofFor(proofId: string) {
  const proof = await prisma.proof.findUnique({ where: { id: proofId }, include: { orderItem: { include: { order: true, proofs: { orderBy: { version: "desc" }, take: 1 } } } } });
  if (!proof) throw new ProofError("Proof not found.");
  if (proof.orderItem.proofs[0]?.id !== proof.id) throw new ProofError("A newer version of this proof exists. Please review the latest version.");
  return proof;
}

export async function approveProof(input: { proofId: string; actor: { email: string; customerId?: string | null }; ipAddress?: string | null; userAgent?: string | null; confirmed: boolean }) {
  if (!input.confirmed) throw new ProofError("Please confirm the approval statement.");
  const proof = await latestProofFor(input.proofId);
  if (proof.status === "APPROVED") return proof; // idempotent
  if (proof.status !== "SENT") throw new ProofError("This proof isn't awaiting approval.");

  await prisma.$transaction(async (tx) => {
    // Re-check inside the transaction to avoid double approvals.
    const updated = await tx.proof.updateMany({ where: { id: proof.id, status: "SENT", locked: false }, data: { status: "APPROVED", locked: true } });
    if (!updated.count) throw new ProofError("This proof was just updated. Please refresh.");
    await tx.proofApproval.create({
      data: {
        proofId: proof.id, customerId: input.actor.customerId ?? null, approvedByEmail: input.actor.email, confirmationText: APPROVAL_STATEMENT,
        contentHash: proofContentHash(proof), ipAddress: input.ipAddress ?? null, userAgent: input.userAgent?.slice(0, 400) ?? null,
      },
    });
  });

  const orderId = proof.orderItem.orderId;
  if (await allProofsApproved(orderId)) {
    await transitionOrder(orderId, "PROOF_APPROVED", { silent: true, note: "All proofs approved" });
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    if (order.paymentStatus !== "PAID") await transitionOrder(orderId, "PAYMENT_PENDING", { silent: true, note: "Awaiting payment" });
  }
  await emit({ type: "proof.approved", proofId: proof.id });
  return proof;
}

export async function requestRevision(input: { proofId: string; comment: string; artworkFileId?: string | null; customerId?: string | null }) {
  const comment = input.comment.trim();
  if (comment.length < 3) throw new ProofError("Tell us what you'd like changed.");
  const proof = await latestProofFor(input.proofId);
  if (proof.status !== "SENT") throw new ProofError("This proof isn't awaiting review.");
  if (proof.locked) throw new ProofError("Approved proofs are locked.");

  const revision = await prisma.$transaction(async (tx) => {
    await tx.proof.update({ where: { id: proof.id }, data: { status: "REVISION_REQUESTED" } });
    return tx.proofRevision.create({ data: { proofId: proof.id, comment: comment.slice(0, 3000), artworkFileId: input.artworkFileId ?? null, customerId: input.customerId ?? null } });
  });
  try {
    await transitionOrder(proof.orderItem.orderId, "REVISION_REQUESTED", { silent: true, note: `Revision requested on V${proof.version}` });
  } catch (e) {
    if (!(e instanceof OrderError)) throw e;
  }
  await emit({ type: "proof.revision_requested", proofId: proof.id, revisionId: revision.id });
  return revision;
}
