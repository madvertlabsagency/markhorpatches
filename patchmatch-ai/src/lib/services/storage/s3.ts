import "server-only";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageAdapter } from "./types";

/** Works with AWS S3, Cloudflare R2, MinIO, Backblaze B2 and other S3-compatible stores. Bucket must be PRIVATE. */
export function createS3Storage(): StorageAdapter {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is not configured");
  const client = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: process.env.S3_ACCESS_KEY_ID
      ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "" }
      : undefined,
  });

  return {
    name: "s3",
    async createUploadUrl(key, contentType) {
      const url = await getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), { expiresIn: 900 });
      return { url, method: "PUT", headers: { "Content-Type": contentType } };
    },
    async getDownloadUrl(key, opts = {}) {
      const disposition = `${opts.inline ? "inline" : "attachment"}${opts.filename ? `; filename="${opts.filename.replace(/"/g, "")}"` : ""}`;
      return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentDisposition: disposition }), { expiresIn: opts.expiresIn ?? 900 });
    },
    async head(key) {
      try {
        const r = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return { size: r.ContentLength ?? 0 };
      } catch {
        return null;
      }
    },
    async readHead(key, bytes) {
      const r = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: `bytes=0-${bytes - 1}` }));
      const arr = await r.Body!.transformToByteArray();
      return Buffer.from(arr);
    },
    async read(key) {
      const r = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      return Buffer.from(await r.Body!.transformToByteArray());
    },
    async put(key, body, contentType) {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}
