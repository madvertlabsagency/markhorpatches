import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUserForFiles, signedFileUrl, type FileVariant } from "@/lib/files";

/** Every download is authorised server-side, then redirected to a short-lived signed URL. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 });
  const v = new URL(req.url).searchParams.get("variant");
  const variant: FileVariant = v === "preview" || v === "teaser" ? v : "original";
  const att = await prisma.attachment.findUnique({ where: { id } });
  if (!att) return new NextResponse(null, { status: 404 });
  const url = await signedFileUrl(att, variant, await currentUserForFiles());
  if (!url) return new NextResponse(null, { status: 404 });
  return NextResponse.redirect(new URL(url, req.url), { headers: { "Cache-Control": "private, no-store" } });
}
