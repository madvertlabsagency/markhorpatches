"use client";

import { useState, useTransition } from "react";
import { FileText, Trash2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/fields";
import { FileUploader, type UploadedFile } from "@/components/forms/FileUploader";
import { attachDocumentAction, removeDocumentAction, submitVerificationAction } from "@/app/actions/seller";
import { useRouter } from "next/navigation";

const KINDS = [
  ["BUSINESS_REGISTRATION", "Business registration"],
  ["FACTORY_PHOTO", "Factory / equipment photo"],
  ["TAX_CERTIFICATE", "Tax certificate"],
  ["IDENTITY", "Owner identity document"],
  ["OTHER", "Other"],
] as const;

export function VerificationUploads({ editable, ready, canSubmit, docs }: { editable: boolean; ready: boolean; canSubmit: boolean; docs: { id: string; kind: string; name: string; attachmentId: string; createdAt: string }[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<string>("BUSINESS_REGISTRATION");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const onUpload = (files: UploadedFile[]) => {
    const f = files.at(-1);
    if (!f) return;
    start(async () => {
      const r = await attachDocumentAction(f.id, kind);
      setMsg(r && !r.ok ? r.error : null);
      router.refresh();
    });
  };
  return (
    <Card>
      <CardHeader title="Documents" description="PDF, PNG or JPG up to 15 MB. Include at least one registration document and two factory photos." />
      <div className="space-y-5 p-5">
        {editable && (
          <div className="space-y-3">
            <label className="block text-sm font-medium" htmlFor="kind">Document type</label>
            <Select id="kind" value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
            <FileUploader key={docs.length} purpose="SELLER_DOCUMENT" value={[]} onChange={onUpload} maxFiles={1} compact label="Upload a document" />
          </div>
        )}
        <ul className="divide-y divide-line rounded-xl border border-line">
          {docs.length === 0 && <li className="px-4 py-4 text-sm text-muted">No documents yet.</li>}
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <FileText className="h-4 w-4 text-muted" />
              <a href={`/api/files/${d.attachmentId}`} className="min-w-0 flex-1 truncate hover:text-electric">{d.name}</a>
              <span className="text-xs text-muted">{KINDS.find((k) => k[0] === d.kind)?.[1]}</span>
              {editable && <button type="button" onClick={() => start(async () => { await removeDocumentAction(d.id); router.refresh(); })} className="rounded p-1 text-muted hover:text-danger" aria-label={`Remove ${d.name}`}><Trash2 className="h-4 w-4" /></button>}
            </li>
          ))}
        </ul>
        {msg && <p className="text-sm text-danger" role="alert">{msg}</p>}
        {canSubmit && (
          <Button type="button" disabled={!ready} loading={pending} onClick={() => start(async () => { const r = await submitVerificationAction(); setMsg(r && !r.ok ? r.error : r?.message ?? null); router.refresh(); })}>
            Submit for review
          </Button>
        )}
        {canSubmit && !ready && <p className="text-xs text-muted">Add your manufacturing capabilities to submit. Documents are optional — our team can verify you manually.</p>}
      </div>
    </Card>
  );
}
