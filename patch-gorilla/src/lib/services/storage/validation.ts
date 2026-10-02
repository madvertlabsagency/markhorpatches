/** Upload validation shared by client (fast feedback) and server (authoritative). */

export const ARTWORK_TYPES: Record<string, { mimes: string[]; label: string; previewable: boolean }> = {
  png: { mimes: ["image/png"], label: "PNG", previewable: true },
  jpg: { mimes: ["image/jpeg"], label: "JPG", previewable: true },
  jpeg: { mimes: ["image/jpeg"], label: "JPG", previewable: true },
  pdf: { mimes: ["application/pdf"], label: "PDF", previewable: false },
  svg: { mimes: ["image/svg+xml"], label: "SVG", previewable: false },
  ai: { mimes: ["application/postscript", "application/illustrator", "application/pdf", "application/octet-stream", ""], label: "AI", previewable: false },
  eps: { mimes: ["application/postscript", "application/eps", "image/x-eps", "application/octet-stream", ""], label: "EPS", previewable: false },
};

export const ACCEPT_ATTR = ".png,.jpg,.jpeg,.pdf,.svg,.ai,.eps";

export function fileExtension(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

export function sanitizeFilename(name: string): string {
  const ext = fileExtension(name);
  const stem = name
    .replace(/\.[^.]*$/, "")
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .replace(/[\s.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${stem || "artwork"}${ext ? "." + ext : ""}`;
}

export type ValidationResult = { ok: true; ext: string; mime: string } | { ok: false; reason: string };

export function validateUploadMeta(name: string, mime: string, size: number, maxBytes: number): ValidationResult {
  const ext = fileExtension(name);
  const type = ARTWORK_TYPES[ext];
  if (!type) return { ok: false, reason: `We can't accept .${ext || "unknown"} files. Please upload PNG, JPG, PDF, SVG, AI or EPS.` };
  if (!type.mimes.includes(mime)) return { ok: false, reason: `The file type (${mime || "unknown"}) doesn't match a .${ext} file.` };
  if (size <= 0) return { ok: false, reason: "That file is empty." };
  if (size > maxBytes) return { ok: false, reason: `That file is ${(size / 1_048_576).toFixed(1)} MB — the limit is ${Math.round(maxBytes / 1_048_576)} MB.` };
  return { ok: true, ext, mime: type.mimes[0] || "application/octet-stream" };
}

/** Magic-byte sniffing — confirms the bytes are what the extension claims. */
export function sniffMatches(ext: string, head: Buffer): boolean {
  const hex = head.subarray(0, 8).toString("hex");
  const text = head.toString("utf8", 0, Math.min(head.length, 512)).trimStart().toLowerCase();
  switch (ext) {
    case "png":
      return hex.startsWith("89504e470d0a1a0a");
    case "jpg":
    case "jpeg":
      return hex.startsWith("ffd8ff");
    case "pdf":
      return text.startsWith("%pdf");
    case "svg":
      return (text.startsWith("<?xml") || text.startsWith("<svg") || text.startsWith("<!--")) && text.includes("<svg");
    case "ai":
      return text.startsWith("%pdf") || text.startsWith("%!ps");
    case "eps":
      return text.startsWith("%!ps") || hex.startsWith("c5d0d3c6");
    default:
      return false;
  }
}
