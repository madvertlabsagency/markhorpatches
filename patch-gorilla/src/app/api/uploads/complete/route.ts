import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/services/storage";
import { ARTWORK_TYPES } from "@/lib/services/storage/validation";
import { loadSettings } from "@/lib/settings";
import { ownerContext } from "@/lib/cart-session";
import { verifyStoredObject } from "@/lib/uploads";

export async function POST(req: Request) {
  const parsed = z.object({ id: z.string().min(1) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const owner = await ownerContext();
  const file = await prisma.artworkFile.findUnique({ where: { id: parsed.data.id } });
  const owns = file && ((owner.customerId && file.customerId === owner.customerId) || (owner.anonOwnerId && file.anonOwnerId === owner.anonOwnerId));
  if (!file || !owns) return NextResponse.json({ error: "File not found." }, { status: 404 });
  if (file.status === "UPLOADED") return NextResponse.json({ id: file.id, filename: file.originalFilename });

  const settings = await loadSettings();
  const check = await verifyStoredObject(file.storageKey, file.extension, settings.uploads.maxUploadMb * 1_048_576);
  if (!check.ok) {
    await prisma.artworkFile.update({ where: { id: file.id }, data: { status: "REJECTED", rejectionReason: check.reason } });
    return NextResponse.json({ error: check.reason }, { status: 422 });
  }
  await prisma.artworkFile.update({ where: { id: file.id }, data: { status: "UPLOADED", sizeBytes: check.size } });
  const previewable = ARTWORK_TYPES[file.extension]?.previewable;
  const previewUrl = previewable ? await storage().getDownloadUrl(file.storageKey, { inline: true, expiresIn: 3600 }) : null;
  return NextResponse.json({ id: file.id, filename: file.originalFilename, previewUrl });
}
