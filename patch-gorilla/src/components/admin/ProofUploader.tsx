"use client";
import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { createProofAdmin } from "@/app/admin/actions";
import { btnCls, inputCls, Label } from "./ui";

/** Staff proof upload: signed direct upload → server action verifies token + file bytes → creates the next proof version. */
export function ProofUploader({ itemId }: { itemId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    setToken(null);
    setProgress(0);
    try {
      const res = await fetch("/api/uploads/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, purpose: "proof" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", data.upload.url);
        Object.entries(data.upload.headers as Record<string, string>).forEach(([k, v]) => xhr.setRequestHeader(k, v));
        xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(e.loaded / e.total);
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Storage error ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(file);
      });
      setToken(data.proofToken);
      setName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setProgress(null);
    }
  };

  return (
    <form action={createProofAdmin} className="space-y-3 rounded-xl border border-dashed border-navy/20 bg-offwhite p-4">
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="proofToken" value={token ?? ""} />
      <Label>New proof version (PNG, JPG or PDF)</Label>
      <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-white px-3 py-3 text-sm ring-1 ring-line hover:ring-navy/30">
        <UploadCloud className="h-5 w-5 text-electric" aria-hidden />
        <span className="truncate">{name ?? (progress !== null ? `Uploading… ${Math.round(progress * 100)}%` : "Choose proof file")}</span>
        <input type="file" accept=".png,.jpg,.jpeg,.pdf" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div><Label htmlFor={`dn-${itemId}`}>Designer notes (shown to customer)</Label><textarea id={`dn-${itemId}`} name="designerNotes" className={`${inputCls} h-20 py-2`} /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="send" defaultChecked className="h-4 w-4 accent-electric" /> Send to customer now (emails &ldquo;Your Markhor Proof Is Ready&rdquo;)</label>
      <button className={btnCls} disabled={!token}>Create proof version</button>
    </form>
  );
}
