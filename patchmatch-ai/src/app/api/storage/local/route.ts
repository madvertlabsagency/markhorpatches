import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { verifyPayload } from "@/lib/crypto";
import { localPath, readLocal } from "@/lib/services/storage/local";
import { storageDriver } from "@/lib/services/storage";

/** Development storage endpoint. Only active with STORAGE_DRIVER=local. All access via signed, expiring tokens. */
function enabled() {
  return storageDriver() === "local";
}

export async function PUT(req: Request) {
  if (!enabled()) return new NextResponse(null, { status: 404 });
  const token = new URL(req.url).searchParams.get("token");
  const data = verifyPayload<{ op: string; key: string; contentType: string; maxBytes: number }>(token);
  if (!data || data.op !== "put") return NextResponse.json({ error: "Upload link expired." }, { status: 403 });
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > data.maxBytes) return NextResponse.json({ error: "File too large." }, { status: 413 });
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length > data.maxBytes) return NextResponse.json({ error: "File too large." }, { status: 413 });
  const p = localPath(data.key);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, buf);
  return new NextResponse(null, { status: 200 });
}

const INLINE_SAFE: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

export async function GET(req: Request) {
  if (!enabled()) return new NextResponse(null, { status: 404 });
  const token = new URL(req.url).searchParams.get("token");
  const data = verifyPayload<{ op: string; key: string; filename?: string; inline?: boolean }>(token);
  if (!data || data.op !== "get") return NextResponse.json({ error: "Link expired." }, { status: 403 });
  let body: Buffer;
  try {
    body = await readLocal(data.key);
  } catch {
    return new NextResponse(null, { status: 404 });
  }
  const ext = data.key.split(".").pop()?.toLowerCase() ?? "";
  const inlineType = INLINE_SAFE[ext];
  const inline = !!data.inline && !!inlineType; // SVG/AI/EPS are never served inline
  const name = (data.filename ?? data.key.split("/").pop() ?? "file").replace(/[^\w.-]/g, "_");
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": inline ? inlineType : "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
      "Cache-Control": "private, max-age=300",
    },
  });
}
