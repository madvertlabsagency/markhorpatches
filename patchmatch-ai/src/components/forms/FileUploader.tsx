"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, ImageIcon, Loader2, Trash2, UploadCloud, XCircle } from "lucide-react";
import { acceptAttr, PURPOSE_RULES, validateUploadMeta, type UploadPurpose } from "@/lib/services/storage/validation";
import { cn } from "@/lib/utils";

export interface UploadedFile {
  id: string;
  filename: string;
  previewUrl?: string | null;
  extension?: string;
  size?: number;
}

interface Item {
  key: string;
  name: string;
  progress: number;
  status: "uploading" | "verifying" | "done" | "error";
  error?: string;
  file?: UploadedFile;
}

function putWithProgress(url: string, file: File, headers: Record<string, string>, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

/** Drag-and-drop uploader → signed direct upload → server verification. Reports READY files only. */
export function FileUploader({ purpose, value, onChange, maxFiles, label = "Drop files here or browse", compact }: { purpose: UploadPurpose; value: UploadedFile[]; onChange: (files: UploadedFile[]) => void; maxFiles?: number; label?: string; compact?: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rules = PURPOSE_RULES[purpose];
  const limit = maxFiles ?? rules.maxFiles;
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const update = (key: string, patch: Partial<Item>) => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const upload = useCallback(
    async (file: File) => {
      const key = `${file.name}-${file.size}-${Math.random()}`;
      setItems((prev) => [...prev, { key, name: file.name, progress: 0, status: "uploading" }]);
      const v = validateUploadMeta(purpose, file.name, file.type, file.size);
      if (!v.ok) return update(key, { status: "error", error: v.reason });
      try {
        const signRes = await fetch("/api/uploads/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, purpose }) });
        const sign = await signRes.json();
        if (!signRes.ok) throw new Error(sign.error ?? "Upload could not start");
        await putWithProgress(sign.upload.url, file, sign.upload.headers, (p) => update(key, { progress: p }));
        update(key, { status: "verifying", progress: 100 });
        const doneRes = await fetch("/api/uploads/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sign.id }) });
        const done = await doneRes.json();
        if (!doneRes.ok) throw new Error(done.error ?? "Verification failed");
        const uploaded: UploadedFile = { id: done.id, filename: done.filename, previewUrl: done.previewUrl, extension: done.extension, size: done.size };
        update(key, { status: "done", file: uploaded });
        valueRef.current = [...valueRef.current, uploaded];
        onChange(valueRef.current);
        setItems((prev) => prev.filter((i) => i.key !== key));
      } catch (e) {
        update(key, { status: "error", error: e instanceof Error ? e.message : "Upload failed" });
      }
    },
    [purpose, onChange],
  );

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const room = limit - value.length - items.filter((i) => i.status !== "error").length;
    Array.from(list)
      .slice(0, Math.max(0, room))
      .forEach((f) => void upload(f));
  };

  const full = value.length >= limit;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!full) handleFiles(e.dataTransfer.files);
        }}
        className={cn("relative rounded-2xl border-2 border-dashed text-center transition", compact ? "px-4 py-5" : "px-6 py-10", drag ? "border-electric bg-electric/5" : "border-line bg-surface-2/40", full && "opacity-60")}
      >
        <UploadCloud className={cn("mx-auto text-electric", compact ? "h-6 w-6" : "h-9 w-9")} aria-hidden />
        <p className="mt-2 text-sm font-semibold">{full ? `Maximum of ${limit} files reached` : label}</p>
        <p className="mt-1 text-xs text-muted">
          {rules.exts.map((e) => e.toUpperCase()).filter((e, i, a) => a.indexOf(e) === i).join(", ")} · up to {rules.maxMb} MB each · max {limit} files
        </p>
        {!full && (
          <button type="button" onClick={() => inputRef.current?.click()} className="mt-3 rounded-lg border border-line bg-surface px-3.5 py-1.5 text-sm font-semibold hover:border-electric/50">
            Browse files
          </button>
        )}
        <input ref={inputRef} type="file" multiple accept={acceptAttr(purpose)} className="sr-only" onChange={(e) => handleFiles(e.target.files)} aria-label="Choose files to upload" tabIndex={-1} />
      </div>

      {(value.length > 0 || items.length > 0) && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {value.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2">
                {f.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.previewUrl} alt="" className="h-full w-full object-cover" />
                ) : f.extension === "pdf" ? (
                  <FileText className="h-5 w-5 text-muted" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.filename}</p>
                <p className="text-xs text-success">Verified{f.size ? ` · ${(f.size / 1_048_576).toFixed(1)} MB` : ""}</p>
              </div>
              <button type="button" onClick={() => onChange(value.filter((x) => x.id !== f.id))} className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger" aria-label={`Remove ${f.filename}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {items.map((i) => (
            <li key={i.key} className={cn("rounded-xl border p-2.5", i.status === "error" ? "border-danger/40 bg-danger/5" : "border-line bg-surface")}>
              <div className="flex items-center gap-2">
                {i.status === "error" ? <XCircle className="h-4 w-4 shrink-0 text-danger" /> : <Loader2 className="h-4 w-4 shrink-0 animate-spin text-electric" />}
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{i.name}</p>
                {i.status === "error" && (
                  <button type="button" className="text-xs font-semibold text-muted hover:text-fg" onClick={() => setItems((p) => p.filter((x) => x.key !== i.key))}>
                    Dismiss
                  </button>
                )}
              </div>
              {i.status === "error" ? (
                <p className="mt-1 text-xs text-danger" role="alert">
                  {i.error}
                </p>
              ) : (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={i.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${i.name}`}>
                  <div className="h-full rounded-full bg-electric transition-all" style={{ width: `${i.progress}%` }} />
                </div>
              )}
              {i.status === "verifying" && <p className="mt-1 text-xs text-muted">Checking file…</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
