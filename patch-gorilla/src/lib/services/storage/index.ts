import "server-only";
import type { StorageAdapter } from "./types";
import { localStorage } from "./local";
import { createS3Storage } from "./s3";

let adapter: StorageAdapter | null = null;

export function storage(): StorageAdapter {
  if (adapter) return adapter;
  adapter = process.env.STORAGE_DRIVER === "s3" ? createS3Storage() : localStorage;
  if (adapter.name === "local" && process.env.NODE_ENV === "production") console.warn("[storage] Using LOCAL storage in production — configure S3.");
  return adapter;
}

export type { StorageAdapter };
