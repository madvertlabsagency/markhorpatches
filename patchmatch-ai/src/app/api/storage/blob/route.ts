import { NextResponse } from "next/server";
import { verifyPayload } from "@/lib/crypto";
import { storage } from "@/lib/services/storage";

/** Streams a Vercel Blob object behind a signed, expiring token (issued only after authorisation in /api/files/[id]). */
const INLINE_SAFE: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

export async function GET(req: Request) {
  if (storage().name !== "vercel-blob") return new NextResponse(null, { status: 404 });
  const token = new URL(req.url).searchParams.get("token");
  const data = verifyPayload<{ op: string; key: string; filename?: string; inline?: boolean }>(token);
  if (!data || data.op !== "get") return NextResponse.json({ error: "Link expired." }, { status: 403 });
  let body: Buffer;
  try {
    body = await storage().read(data.key);
  } catch {
    return new NextResponse(null, { status: 404 });
  }
  const ext = data.key.split(".").pop()?.toLowerCase() ?? "";
  const inlineType = INLINE_SAFE[ext];
  const inline = !!data.inline && !!inlineType; // SVG/PDF are never served inline
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
