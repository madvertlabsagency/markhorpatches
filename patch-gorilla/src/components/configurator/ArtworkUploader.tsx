"use client";
import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, FileImage, FileText, RefreshCw, UploadCloud, X } from "lucide-react";
import { ACCEPT_ATTR, ARTWORK_TYPES, fileExtension, validateUploadMeta } from "@/lib/services/storage/validation";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export interface UploadedArtwork {
  id: string;
  filename: string;
  previewUrl: string | null;
  sizeBytes: number;
}

type Status = { kind: "idle" } | { kind: "uploading"; progress: number; name: string } | { kind: "error"; reason: string } | { kind: "done" };

function putWithProgress(url: string, headers: Record<string, string>, file: File, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(xhr.status === 413 ? "The file is larger than the upload limit." : `The storage server rejected the upload (HTTP ${xhr.status}).`)));
    xhr.onerror = () => reject(new Error("The connection dropped while uploading. Check your internet connection and try again."));
    xhr.send(file);
  });
}

/** Signed direct-to-storage upload with progress, validation and a friendly (but specific) error state. */
export function ArtworkUploader({ value, onChange, maxMb, compact, dark }: { value: UploadedArtwork | null; onChange: (a: UploadedArtwork | null) => void; maxMb: number; compact?: boolean; dark?: boolean }) {
  const [status, setStatus] = useState<Status>({ kind: value ? "done" : "idle" });
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      const mime = file.type || "";
      const v = validateUploadMeta(file.name, mime, file.size, maxMb * 1_048_576);
      if (!v.ok) return setStatus({ kind: "error", reason: v.reason });
      setStatus({ kind: "uploading", progress: 0, name: file.name });
      try {
        const signRes = await fetch("/api/uploads/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: mime, size: file.size }) });
        const signed = await signRes.json();
        if (!signRes.ok) throw new Error(signed.error ?? "We couldn't start the upload.");
        await putWithProgress(signed.upload.url, signed.upload.headers, file, (p) => setStatus({ kind: "uploading", progress: p, name: file.name }));
        const doneRes = await fetch("/api/uploads/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: signed.id }) });
        const done = await doneRes.json();
        if (!doneRes.ok) throw new Error(done.error ?? "We couldn't verify the file.");
        onChange({ id: done.id, filename: done.filename, previewUrl: done.previewUrl ?? null, sizeBytes: file.size });
        setStatus({ kind: "done" });
        track("upload_artwork", { ext: fileExtension(file.name), size_kb: Math.round(file.size / 1024) });
      } catch (e) {
        setStatus({ kind: "error", reason: e instanceof Error ? e.message : "Unknown error." });
      }
    },
    [maxMb, onChange],
  );

  const onFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f) void upload(f);
  };

  if (value && status.kind !== "uploading") {
    const ext = fileExtension(value.filename);
    return (
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn("relative flex items-center gap-4 rounded-2xl border-2 border-success/30 p-4", dark ? "bg-white/5" : "bg-success/5")}>
        <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-line">
          {value.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived private URL
            <img src={value.previewUrl} alt="Uploaded artwork preview" className="h-full w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center text-slate">
              {ext === "pdf" ? <FileText className="h-8 w-8" aria-hidden /> : <FileImage className="h-8 w-8" aria-hidden />}
              <span className="mt-1 text-[10px] font-bold uppercase">{ARTWORK_TYPES[ext]?.label ?? ext}</span>
            </div>
          )}
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 14 }} className="absolute -right-1 -top-1 rounded-full bg-white">
            <CheckCircle2 className="h-6 w-6 text-success" aria-hidden />
          </motion.span>
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("font-semibold", dark ? "text-white" : "text-navy")}>Artwork received</p>
          <p className="truncate text-sm text-slate" title={value.filename}>{value.filename}</p>
          <p className="text-xs text-slate">{(value.sizeBytes / 1_048_576).toFixed(1)} MB{!value.previewUrl && " · preview not available for this format — our designers will open it"}</p>
        </div>
        <div className="flex flex-col gap-1">
          <button type="button" onClick={() => inputRef.current?.click()} className="grid h-10 w-10 place-items-center rounded-full hover:bg-navy/5" aria-label="Replace artwork"><RefreshCw className="h-4 w-4" /></button>
          <button type="button" onClick={() => { onChange(null); setStatus({ kind: "idle" }); }} className="grid h-10 w-10 place-items-center rounded-full hover:bg-danger/10 hover:text-danger" aria-label="Remove artwork"><X className="h-4 w-4" /></button>
        </div>
        <input ref={inputRef} type="file" accept={ACCEPT_ATTR} className="sr-only" onChange={(e) => onFiles(e.target.files)} tabIndex={-1} aria-hidden />
      </motion.div>
    );
  }

  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files); }}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[1.5rem] border-2 border-dashed text-center transition-all duration-300",
          compact ? "px-4 py-8" : "px-6 py-12",
          over ? "scale-[1.01] border-electric bg-electric/5" : dark ? "border-white/20 bg-white/5 hover:border-turquoise" : "border-navy/20 bg-white hover:border-electric",
        )}
      >
        <input ref={inputRef} type="file" accept={ACCEPT_ATTR} className="sr-only" onChange={(e) => onFiles(e.target.files)} disabled={status.kind === "uploading"} />
        <AnimatePresence mode="wait">
          {status.kind === "uploading" ? (
            <motion.div key="up" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-xs" role="status" aria-live="polite">
              <p className={cn("font-display text-2xl font-extrabold uppercase", dark ? "text-white" : "text-navy")}>Uploading…</p>
              <p className="mt-1 truncate text-sm text-slate">{status.name}</p>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-navy/10">
                <motion.div className="bg-signature h-full rounded-full" animate={{ width: `${Math.max(4, status.progress * 100)}%` }} />
              </div>
              <p className="mt-2 text-xs tabular-nums text-slate">{Math.round(status.progress * 100)}%</p>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
              <span className="bg-signature grid h-16 w-16 place-items-center rounded-2xl text-white shadow-glow transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                <UploadCloud className="h-8 w-8" aria-hidden />
              </span>
              <p className={cn("display mt-5 text-4xl", dark ? "text-white" : "text-navy")}>Drop your art.</p>
              <p className="hand mt-1 -rotate-1 text-lg text-electric">Napkin sketch? We&apos;ve seen worse.</p>
              <p className="mt-3 text-sm text-slate">Drag & drop or <span className="font-semibold text-patch underline">browse</span> · PNG, JPG, PDF, SVG, AI, EPS · up to {maxMb} MB</p>
            </motion.div>
          )}
        </AnimatePresence>
      </label>
      {status.kind === "error" && (
        <div role="alert" className="mt-3 rounded-2xl border border-danger/20 bg-danger/5 p-4">
          <p className="font-semibold text-navy">That file gave Gorilla a headache.</p>
          <p className="mt-1 text-sm text-slate">{status.reason}</p>
          <button type="button" onClick={() => inputRef.current?.click()} className="mt-2 text-sm font-semibold text-patch underline">Try another file</button>
        </div>
      )}
    </div>
  );
}
