import "server-only";
import type { FullOrder } from "@/lib/domain/orders";
import { storage } from "@/lib/services/storage";
import type { ProofVersion } from "@/components/proof/ProofPanel";

/** Proofs → client view model with short-lived signed URLs. Drafts are never exposed to customers. */
export async function proofViews(item: FullOrder["items"][number], opts: { includeDrafts?: boolean } = {}): Promise<ProofVersion[]> {
  const s = storage();
  const list = item.proofs.filter((p) => opts.includeDrafts || p.status !== "DRAFT");
  return Promise.all(
    list.map(async (p) => {
      const isImage = /^image\/(png|jpe?g|webp)$/.test(p.fileMimeType);
      return {
        id: p.id, version: p.version, status: p.status, isImage,
        previewUrl: isImage ? await s.getDownloadUrl(p.fileKey, { inline: true, expiresIn: 3600 }) : null,
        downloadUrl: await s.getDownloadUrl(p.fileKey, { filename: `proof-v${p.version}.${p.fileKey.split(".").pop()}`, inline: p.fileMimeType === "application/pdf", expiresIn: 3600 }),
        designerNotes: p.designerNotes, sentAt: p.sentAt?.toISOString() ?? null, spec: p.specSnapshot as Record<string, unknown>,
        approval: p.approval ? { approvedAt: p.approval.approvedAt.toISOString(), approvedByEmail: p.approval.approvedByEmail } : null,
        revisions: p.revisions.map((r) => ({ id: r.id, comment: r.comment, createdAt: r.createdAt.toISOString() })),
      };
    }),
  );
}
