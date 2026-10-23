import "server-only";
import { mkdir, readFile, stat, unlink, writeFile, open } from "node:fs/promises";
import path from "node:path";
import { signPayload } from "@/lib/crypto";
import type { StorageAdapter } from "./types";

/**
 * DEVELOPMENT storage: files live in ./.uploads (outside /public, never served statically).
 * Uploads and downloads go through signed, expiring tokens handled by /api/storage/local.
 */
export const ROOT = path.join(process.cwd(), ".uploads");

export function localPath(key: string) {
  const p = path.normalize(path.join(ROOT, key));
  if (!p.startsWith(ROOT + path.sep)) throw new Error("Invalid storage key");
  return p;
}

export const localStorage: StorageAdapter = {
  name: "local",
  async createUploadUrl(key, contentType, maxBytes) {
    const token = signPayload({ op: "put", key, contentType, maxBytes }, 15 * 60);
    return { kind: "put", url: `/api/storage/local?token=${encodeURIComponent(token)}`, method: "PUT", headers: { "Content-Type": contentType } };
  },
  async getDownloadUrl(key, opts = {}) {
    const token = signPayload({ op: "get", key, filename: opts.filename, inline: !!opts.inline }, opts.expiresIn ?? 15 * 60);
    return `/api/storage/local?token=${encodeURIComponent(token)}`;
  },
  async head(key) {
    try {
      const s = await stat(localPath(key));
      return { size: s.size };
    } catch {
      return null;
    }
  },
  async readHead(key, bytes) {
    const fh = await open(localPath(key), "r");
    try {
      const buf = Buffer.alloc(bytes);
      const { bytesRead } = await fh.read(buf, 0, bytes, 0);
      return buf.subarray(0, bytesRead);
    } finally {
      await fh.close();
    }
  },
  async read(key) {
    return readFile(localPath(key));
  },
  async put(key, body) {
    const p = localPath(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, body);
  },
  async delete(key) {
    await unlink(localPath(key)).catch(() => {});
  },
};

export async function readLocal(key: string) {
  return readFile(localPath(key));
}
