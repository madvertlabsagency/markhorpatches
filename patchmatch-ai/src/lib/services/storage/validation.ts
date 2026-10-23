/** Upload validation shared by client (fast feedback) and server (authoritative). */

export type UploadPurpose = "RFQ_ARTWORK" | "SELLER_DOCUMENT" | "PORTFOLIO" | "QUOTE_ATTACHMENT" | "MESSAGE_ATTACHMENT" | "DISPUTE_EVIDENCE";

export const FILE_TYPES: Record<string, { mimes: string[]; label: string; raster: boolean }> = {
  png: { mimes: ["image/png"], label: "PNG", raster: true },
  jpg: { mimes: ["image/jpeg"], label: "JPG", raster: true },
  jpeg: { mimes: ["image/jpeg"], label: "JPEG", raster: true },
  webp: { mimes: ["image/webp"], label: "WEBP", raster: true },
  pdf: { mimes: ["application/pdf"], label: "PDF", raster: false },
  // SVG is accepted for artwork only. It is never rendered or served inline (script/XXE risk);
  // it is checked for active content and delivered as an attachment download.
  svg: { mimes: ["image/svg+xml"], label: "SVG", raster: false },
};

/**
 * AI/EPS are NOT accepted: there is no safe, tested processing pipeline for PostScript in this
 * deployment. Buyers are asked to export PDF instead (documented in PRODUCTION_READINESS.md).
 */
export const PURPOSE_RULES: Record<UploadPurpose, { exts: string[]; maxMb: number; maxFiles: number }> = {
  RFQ_ARTWORK: { exts: ["png", "jpg", "jpeg", "pdf", "svg"], maxMb: 25, maxFiles: 10 },
  SELLER_DOCUMENT: { exts: ["pdf", "png", "jpg", "jpeg"], maxMb: 15, maxFiles: 20 },
  PORTFOLIO: { exts: ["png", "jpg", "jpeg", "webp"], maxMb: 10, maxFiles: 40 },
  QUOTE_ATTACHMENT: { exts: ["pdf", "png", "jpg", "jpeg"], maxMb: 10, maxFiles: 5 },
  MESSAGE_ATTACHMENT: { exts: ["pdf", "png", "jpg", "jpeg"], maxMb: 10, maxFiles: 5 },
  DISPUTE_EVIDENCE: { exts: ["pdf", "png", "jpg", "jpeg"], maxMb: 10, maxFiles: 5 },
};

export function acceptAttr(purpose: UploadPurpose) {
  return PURPOSE_RULES[purpose].exts.map((e) => `.${e}`).join(",");
}

export function fileExtension(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

export function sanitizeFilename(name: string): string {
  const ext = fileExtension(name);
  const stem = name
    .replace(/\.[^.]*$/, "")
    .replace(/[\/\\]+/g, " ")
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .replace(/[\s.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${stem || "file"}${ext ? "." + ext : ""}`;
}

export type ValidationResult = { ok: true; ext: string; mime: string } | { ok: false; reason: string };

export function validateUploadMeta(purpose: UploadPurpose, name: string, mime: string, size: number): ValidationResult {
  const rules = PURPOSE_RULES[purpose];
  const ext = fileExtension(name);
  const type = FILE_TYPES[ext];
  const allowed = rules.exts.map((e) => FILE_TYPES[e].label).filter((v, i, a) => a.indexOf(v) === i).join(", ");
  if (!type || !rules.exts.includes(ext)) {
    const hint = ext === "ai" || ext === "eps" ? " Please export your artwork as PDF." : "";
    return { ok: false, reason: `.${ext || "unknown"} files aren't accepted here. Allowed: ${allowed}.${hint}` };
  }
  if (mime && !type.mimes.includes(mime)) return { ok: false, reason: `The file type (${mime}) doesn't match a .${ext} file.` };
  if (size <= 0) return { ok: false, reason: "That file is empty." };
  const max = rules.maxMb * 1_048_576;
  if (size > max) return { ok: false, reason: `That file is ${(size / 1_048_576).toFixed(1)} MB — the limit is ${rules.maxMb} MB.` };
  return { ok: true, ext, mime: type.mimes[0] };
}

/** Magic-byte sniffing — confirms the bytes are what the extension claims. */
export function sniffMatches(ext: string, head: Buffer): boolean {
  const hex = head.subarray(0, 12).toString("hex");
  const text = head.toString("utf8", 0, Math.min(head.length, 1024)).trimStart().toLowerCase();
  switch (ext) {
    case "png":
      return hex.startsWith("89504e470d0a1a0a");
    case "jpg":
    case "jpeg":
      return hex.startsWith("ffd8ff");
    case "webp":
      return hex.startsWith("52494646") && head.subarray(8, 12).toString("ascii") === "WEBP";
    case "pdf":
      return text.startsWith("%pdf");
    case "svg":
      return (text.startsWith("<?xml") || text.startsWith("<svg") || text.startsWith("<!--")) && text.includes("<svg");
    default:
      return false;
  }
}

/** Rejects SVGs with active or external content. Applied to the whole file server-side. */
export function svgIsSafe(content: string): boolean {
  const s = content.toLowerCase();
  if (/<script[\s>]/.test(s)) return false;
  if (/\son[a-z]+\s*=/.test(s)) return false;
  if (/<!entity|<!doctype/.test(s)) return false;
  if (/javascript:/.test(s)) return false;
  if (/<foreignobject[\s>]/.test(s)) return false;
  if (/(?:href|src)\s*=\s*["']\s*(?:https?:|\/\/|data:text)/.test(s)) return false;
  return true;
}
