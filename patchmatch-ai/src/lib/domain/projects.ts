import "server-only";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notify, orgUserIds } from "@/lib/notifications";
import { DomainError, notifyBuyer } from "@/lib/domain/rfq";
import type { ProjectStatus } from "@/generated/prisma/client";

/**
 * Project tracking after a buyer selects a manufacturer — a shared status board, not an order
 * system: PatchMatch does not hold payments, guarantee delivery or arbitrate production.
 */
export const PROJECT_STEPS: { status: ProjectStatus; label: string; hint: string }[] = [
  { status: "SELECTED", label: "Manufacturer selected", hint: "Agree final details and payment terms directly with the manufacturer." },
  { status: "PROOF_APPROVED", label: "Artwork proof approved", hint: "Buyer approved the digital proof." },
  { status: "SAMPLE", label: "Sample", hint: "Optional physical sample produced or shipped." },
  { status: "IN_PRODUCTION", label: "In production", hint: "Manufacturing has started." },
  { status: "SHIPPED", label: "Shipped", hint: "On the way — tracking shared in messages." },
  { status: "DELIVERED", label: "Delivered", hint: "Buyer confirmed delivery." },
];
const ORDER = PROJECT_STEPS.map((s) => s.status);

export async function updateProjectStatus(args: { rfqId: string; status: ProjectStatus; note?: string; actorId: string; side: "BUYER" | "SELLER" }) {
  const project = await prisma.project.findUnique({ where: { rfqId: args.rfqId }, include: { rfq: true } });
  if (!project) throw new DomainError("NOT_FOUND", "No project for this request yet.");
  if (project.status === "DELIVERED" || project.status === "CANCELLED") throw new DomainError("CLOSED", "This project is finished.");
  if (args.status !== "CANCELLED" && ORDER.indexOf(args.status) <= ORDER.indexOf(project.status)) throw new DomainError("INVALID", "Choose a later step.");
  // Buyer confirms proof approval and delivery; manufacturer reports production milestones.
  const buyerOnly: ProjectStatus[] = ["PROOF_APPROVED", "DELIVERED"];
  if (args.side === "SELLER" && buyerOnly.includes(args.status)) throw new DomainError("FORBIDDEN", "Only the buyer can confirm this step.");
  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id: project.id }, data: { status: args.status } });
    await tx.projectEvent.create({ data: { projectId: project.id, status: args.status, note: args.note?.slice(0, 500), actorId: args.actorId } });
    await audit(args.actorId, "project.status", "Project", project.id, { to: args.status, side: args.side }, tx);
  });
  const label = PROJECT_STEPS.find((s) => s.status === args.status)?.label ?? args.status.toLowerCase();
  if (args.side === "SELLER") await notifyBuyer(args.rfqId, `project:${args.status}`, `Project update: ${label}`, args.note ?? `Your manufacturer marked ${project.rfq.publicRef} as “${label}”.`);
  else {
    const seller = await prisma.sellerProfile.findUniqueOrThrow({ where: { id: project.sellerId } });
    await notify({ userIds: await orgUserIds(seller.orgId), type: "project_update", title: `${project.rfq.publicRef}: ${label}`, body: args.note ?? "The buyer updated the project status.", link: `/seller/opportunities/${args.rfqId}`, dedupeKey: `project:${project.id}:${args.status}` });
  }
}
