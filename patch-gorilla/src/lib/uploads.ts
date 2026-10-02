import "server-only";
import { storage } from "@/lib/services/storage";
import { sniffMatches } from "@/lib/services/storage/validation";

/** Verify an uploaded object: exists, size within limit, bytes match the claimed type. Deletes it if not. */
export async function verifyStoredObject(key: string, ext: string, maxBytes: number): Promise<{ ok: true; size: number } | { ok: false; reason: string }> {
  const s = storage();
  const head = await s.head(key);
  if (!head) return { ok: false, reason: "We didn't receive the file. Please try uploading again." };
  if (head.size === 0 || head.size > maxBytes) {
    await s.delete(key);
    return { ok: false, reason: `The file is ${(head.size / 1_048_576).toFixed(1)} MB — the limit is ${Math.round(maxBytes / 1_048_576)} MB.` };
  }
  const bytes = await s.readHead(key, 1024);
  if (!sniffMatches(ext, bytes)) {
    await s.delete(key);
    return { ok: false, reason: `The file contents don't look like a valid .${ext} file. It may be corrupted or renamed.` };
  }
  return { ok: true, size: head.size };
}
