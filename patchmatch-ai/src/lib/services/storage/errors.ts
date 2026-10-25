import "server-only";
import { storageDriver } from "./index";

/** A user-facing explanation for a failed upload; points at the likely configuration problem. */
export function storageErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const driver = storageDriver();
  if (driver === "local" && process.env.VERCEL) return "File storage isn't connected yet (Vercel Blob). Please try again later or email the file to our team.";
  if (driver === "vercel-blob" && /private|access/i.test(msg)) return "File storage is misconfigured (the Blob store must be Private). Please email the file to our team for now.";
  return `Upload failed on the server: ${msg.slice(0, 160)}`;
}
