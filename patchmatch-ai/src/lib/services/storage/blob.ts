import "server-only";
import { del, get, head as blobHead, put } from "@vercel/blob";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { signPayload } from "@/lib/crypto";
import type { StorageAdapter } from "./types";

/**
 * Vercel Blob storage (the store connected to the Vercel project; BLOB_READ_WRITE_TOKEN).
 * Objects are written with `private` access, so they are never reachable by URL alone.
 * The browser never receives a blob URL: downloads stream through /api/storage/blob behind
 * a signed, expiring token issued only after the normal authorisation check in /api/files/[id].
 * A store created as *public* cannot hold private blobs; uploads then fail with a clear error.
 * An operator may accept that risk explicitly with BLOB_ACCESS=public (unguessable keys only).
 */
type Access = "public" | "private";

function access(): Access {
  return process.env.BLOB_ACCESS === "public" ? "public" : "private";
}

async function readAll(key: string): Promise<Buffer> {
  const r = await get(key, { access: access(), useCache: false });
  if (!r || r.statusCode !== 200) throw new Error("Object not found");
  return Buffer.from(await new Response(r.stream).arrayBuffer());
}

export function createBlobStorage(): StorageAdapter {
  return {
    name: "vercel-blob",
    async createUploadUrl(key, contentType, maxBytes) {
      const a = access();
      const token = await generateClientTokenFromReadWriteToken({
        pathname: key,
        allowedContentTypes: [contentType],
        maximumSizeInBytes: maxBytes,
        validUntil: Date.now() + 15 * 60_000,
        addRandomSuffix: false,
        allowOverwrite: false,
      });
      return { kind: "vercel-blob", pathname: key, token, access: a, contentType };
    },
    async getDownloadUrl(key, opts = {}) {
      const token = signPayload({ op: "get", key, filename: opts.filename, inline: !!opts.inline }, opts.expiresIn ?? 15 * 60);
      return `/api/storage/blob?token=${encodeURIComponent(token)}`;
    },
    async head(key) {
      try {
        const h = await blobHead(key);
        return { size: h.size };
      } catch {
        return null;
      }
    },
    async readHead(key, bytes) {
      return (await readAll(key)).subarray(0, bytes);
    },
    read: readAll,
    async put(key, body, contentType) {
      await put(key, body, { access: access(), contentType, allowOverwrite: true, addRandomSuffix: false });
    },
    async delete(key) {
      await del(key).catch(() => {});
    },
  };
}

export { readAll as readBlob };
