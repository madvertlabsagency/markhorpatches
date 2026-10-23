import "server-only";
import type { StorageAdapter } from "./types";
import { localStorage } from "./local";
import { createS3Storage } from "./s3";
import { createBlobStorage } from "./blob";

let adapter: StorageAdapter | null = null;

/** STORAGE_DRIVER wins; otherwise Vercel Blob when its token is present, S3 when a bucket is set, else local (dev only). */
export function storageDriver(): "local" | "s3" | "vercel-blob" {
  const d = process.env.STORAGE_DRIVER;
  if (d === "s3" || d === "local" || d === "vercel-blob") return d;
  if (process.env.BLOB_READ_WRITE_TOKEN) return "vercel-blob";
  if (process.env.S3_BUCKET) return "s3";
  return "local";
}

export function storage(): StorageAdapter {
  if (adapter) return adapter;
  const d = storageDriver();
  adapter = d === "s3" ? createS3Storage() : d === "vercel-blob" ? createBlobStorage() : localStorage;
  if (adapter.name === "local" && process.env.NODE_ENV === "production") console.warn("[storage] Using LOCAL storage in production — connect Vercel Blob or S3.");
  return adapter;
}

export type { StorageAdapter };
