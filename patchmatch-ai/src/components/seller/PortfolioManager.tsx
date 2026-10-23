"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { FileUploader, type UploadedFile } from "@/components/forms/FileUploader";
import { Input, Select } from "@/components/ui/fields";
import { addPortfolioAction, portfolioItemAction } from "@/app/actions/seller";
import { PATCH_TYPES } from "@/lib/catalog";

export function PortfolioManager({ items }: { items: { id: string; title: string; isPublic: boolean; attachmentId: string; patchType: string | null }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [, start] = useTransition();
  return (
    <div className="space-y-6">
      <div className="card grid gap-3 p-5 sm:grid-cols-[1fr_200px]">
        <Input placeholder="Title (e.g. PVC morale patch for outdoor brand)" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
        <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Patch type"><option value="">Patch type…</option>{PATCH_TYPES.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}</Select>
        <div className="sm:col-span-2">
          <FileUploader key={items.length} purpose="PORTFOLIO" value={[]} maxFiles={10} onChange={(files: UploadedFile[]) => start(async () => { for (const f of files.slice(-1)) await addPortfolioAction(f.id, title || f.filename, type || undefined); setTitle(""); router.refresh(); })} label="Drop portfolio photos" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((i) => (
          <figure key={i.id} className="card overflow-hidden">
            { }
            <img src={`/api/files/${i.attachmentId}?variant=preview`} alt={i.title} className="aspect-square w-full object-cover" loading="lazy" />
            <figcaption className="flex items-center gap-1 px-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-xs">{i.title}</span>
              <button type="button" onClick={() => start(async () => { await portfolioItemAction(i.id, "TOGGLE"); router.refresh(); })} className="rounded p-1 text-muted hover:text-fg" aria-label={i.isPublic ? "Make private" : "Make public"} title={i.isPublic ? "Public" : "Private"}>{i.isPublic ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
              <button type="button" onClick={() => window.confirm("Delete this item?") && start(async () => { await portfolioItemAction(i.id, "DELETE"); router.refresh(); })} className="rounded p-1 text-muted hover:text-danger" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
