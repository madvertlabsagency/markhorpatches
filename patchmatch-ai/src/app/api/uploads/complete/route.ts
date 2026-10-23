import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { guestOwnerHash, signedFileUrl, verifyAndFinalize } from "@/lib/files";

/** Step 2: the server verifies the stored bytes (size, magic bytes, SVG safety) and builds metadata-free previews. */
export async function POST(req: Request) {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const user = await getCurrentUser();
  const guest = await guestOwnerHash();
  const att = await prisma.attachment.findUnique({ where: { id: parsed.data.id } });
  const owns = att && ((user && att.uploaderUserId === user.id) || (guest && att.guestOwnerHash === guest));
  if (!att || !owns) return NextResponse.json({ error: "File not found." }, { status: 404 });
  if (att.status === "REJECTED") return NextResponse.json({ error: att.rejectionReason ?? "File rejected." }, { status: 422 });
  const result = att.status === "READY" ? { ok: true as const, att } : await verifyAndFinalize(att);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 422 });
  const previewUrl = result.att.previewKey ? await signedFileUrl(result.att, "preview", user, 3600) : null;
  return NextResponse.json({ id: att.id, filename: att.originalFilename, previewUrl, extension: att.extension, size: result.att.sizeBytes });
}
