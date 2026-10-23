import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ImageIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireBuyer } from "@/lib/auth/session";
import { storage } from "@/lib/services/storage";
import { PageHeader, EmptyState } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Artwork" };

export default async function BuyerArtwork() {
  const { user, org } = await requireBuyer("/buyer/artwork");
  const items = await prisma.rfqArtwork.findMany({ where: { attachment: { status: "READY" }, rfq: { OR: [{ buyerOrgId: org.id }, { buyerUserId: user.id }] } }, include: { attachment: true, rfq: { select: { id: true, publicRef: true } } }, orderBy: { createdAt: "desc" } });
  const withUrls = await Promise.all(items.map(async (i) => ({ ...i, preview: i.attachment.previewKey ? await storage().getDownloadUrl(i.attachment.previewKey, { inline: true, expiresIn: 900 }) : null })));
  return (
    <>
      <PageHeader title="Artwork" description="Files you've uploaded. Stored privately; download links expire after a few minutes." />
      {withUrls.length === 0 ? <EmptyState icon={ImageIcon} title="No artwork yet" /> : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {withUrls.map((a) => (
            <div key={a.id} className="card overflow-hidden">
              <a href={`/api/files/${a.attachmentId}`} className="block">
                {a.preview ? (
                   
                  <img src={a.preview} alt={a.attachment.originalFilename} className="aspect-square w-full bg-surface-2 object-contain" />
                ) : <div className="grid aspect-square place-items-center bg-surface-2"><FileText className="h-8 w-8 text-muted" /></div>}
              </a>
              <div className="px-3 py-2">
                <p className="truncate text-xs font-medium">{a.attachment.originalFilename}</p>
                <p className="text-[11px] text-muted"><Link href={`/buyer/rfqs/${a.rfq.id}`} className="text-electric">{a.rfq.publicRef}</Link> · {formatDate(a.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
