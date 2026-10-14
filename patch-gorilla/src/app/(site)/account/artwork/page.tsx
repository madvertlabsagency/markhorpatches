import { requireCustomer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui/States";
import { formatDate } from "@/lib/utils";
import { FileImage } from "lucide-react";

export default async function ArtworkLibrary() {
  const { customer } = await requireCustomer("/account/artwork");
  if (!customer) return <EmptyState title="Confirm your email" />;
  const files = await prisma.artworkFile.findMany({ where: { customerId: customer.id, status: "UPLOADED" }, orderBy: { createdAt: "desc" } });
  if (!files.length) return <EmptyState title="No artwork yet." description="Files you upload in the builder, free mockup or revisions are stored privately here." />;
  return (
    <div>
      <h2 className="font-display text-3xl font-extrabold uppercase">Artwork library</h2>
      <p className="mt-1 text-sm text-slate">Stored privately. Download links expire after a few minutes.</p>
      <ul className="mt-4 divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
        {files.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-4 p-4">
            <span className="flex min-w-0 items-center gap-3"><FileImage className="h-5 w-5 shrink-0 text-electric" aria-hidden /><span className="min-w-0"><span className="block truncate font-semibold">{f.originalFilename}</span><span className="text-xs text-slate">{f.extension.toUpperCase()} · {(f.sizeBytes / 1_048_576).toFixed(1)} MB · {formatDate(f.createdAt)}</span></span></span>
            <a href={`/api/artwork/${f.id}`} className="shrink-0 rounded-full bg-ice px-4 py-2 text-sm font-semibold">Download</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
