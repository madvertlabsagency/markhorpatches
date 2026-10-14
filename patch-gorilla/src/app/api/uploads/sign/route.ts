import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/services/storage";
import { sanitizeFilename, validateUploadMeta } from "@/lib/services/storage/validation";
import { loadSettings } from "@/lib/settings";
import { ensureCart } from "@/lib/cart-session";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { signPayload, randomToken } from "@/lib/crypto";

const body = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().max(120),
  size: z.number().int().positive(),
  purpose: z.enum(["artwork", "proof"]).default("artwork"),
});

export async function POST(req: Request) {
  const ip = await clientIp();
  const rl = rateLimit(`upload:${ip}`, LIMITS.upload.limit, LIMITS.upload.windowMs);
  if (!rl.ok) return NextResponse.json({ error: "Too many uploads. Please wait a few minutes." }, { status: 429 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  const { filename, contentType, size, purpose } = parsed.data;

  const settings = await loadSettings();
  const maxBytes = settings.uploads.maxUploadMb * 1_048_576;
  const v = validateUploadMeta(filename, contentType, size, purpose === "proof" ? Math.max(maxBytes, 100 * 1_048_576) : maxBytes);
  if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });

  const safeName = sanitizeFilename(filename);
  const now = new Date();
  const datePath = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  if (purpose === "proof") {
    const user = await getCurrentUser();
    if (!user || !can(user.role, "proofs:write")) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    const key = `proofs/${datePath}/${randomToken(12)}/${safeName}`;
    const upload = await storage().createUploadUrl(key, v.mime, maxBytes);
    const proofToken = signPayload({ key, ext: v.ext, mime: v.mime, by: user.id }, 3600);
    return NextResponse.json({ upload, proofToken, filename: safeName });
  }

  const user = await getCurrentUser();
  const cart = await ensureCart();
  const file = await prisma.artworkFile.create({
    data: {
      customerId: user?.customer?.id ?? null, anonOwnerId: cart.id, storageKey: `pending/${randomToken(16)}`, originalFilename: filename.slice(0, 255),
      sanitizedFilename: safeName, mimeType: v.mime, extension: v.ext, sizeBytes: size,
    },
  });
  const key = `artwork/${datePath}/${file.id}/${safeName}`;
  await prisma.artworkFile.update({ where: { id: file.id }, data: { storageKey: key } });
  const upload = await storage().createUploadUrl(key, contentType || v.mime, maxBytes);
  return NextResponse.json({ id: file.id, upload, filename: safeName });
}
