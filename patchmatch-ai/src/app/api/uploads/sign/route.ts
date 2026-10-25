import { NextResponse } from "next/server";
import { storageErrorMessage } from "@/lib/services/storage/errors";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/services/storage";
import { PURPOSE_RULES, sanitizeFilename, validateUploadMeta } from "@/lib/services/storage/validation";
import { getCurrentUser, membershipOf } from "@/lib/auth/session";
import { guestOwnerHash } from "@/lib/files";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { randomToken } from "@/lib/crypto";

const body = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().max(120),
  size: z.number().int().positive(),
  purpose: z.enum(["RFQ_ARTWORK", "SELLER_DOCUMENT", "PORTFOLIO", "QUOTE_ATTACHMENT", "MESSAGE_ATTACHMENT", "DISPUTE_EVIDENCE"]),
});

/** Step 1 of an upload: authorise, validate metadata, create a PENDING attachment and a short-lived upload URL. */
export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (e) {
    // Never answer with an empty body: the uploader shows this message to the user.
    console.error(`[uploads/sign]`, e);
    return NextResponse.json({ error: storageErrorMessage(e) }, { status: 500 });
  }
}

async function handle(req: Request) {
  const ip = await clientIp();
  const rl = rateLimit(`upload:${ip}`, LIMITS.upload.limit, LIMITS.upload.windowMs);
  if (!rl.ok) return NextResponse.json({ error: "Too many uploads. Please wait a few minutes." }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  const { filename, contentType, size, purpose } = parsed.data;
  const v = validateUploadMeta(purpose, filename, contentType, size);
  if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });

  const user = await getCurrentUser();
  let ownerOrgId: string | null = null;
  let guestHash: string | null = null;
  if (purpose === "RFQ_ARTWORK") {
    if (!user) guestHash = await guestOwnerHash(true);
    ownerOrgId = user ? (membershipOf(user, "BUYER")?.orgId ?? null) : null;
    const owner = user ? { uploaderUserId: user.id } : { guestOwnerHash: guestHash };
    const pending = await prisma.attachment.count({ where: { ...owner, purpose, rfqArtwork: null, status: { in: ["PENDING", "READY"] }, createdAt: { gte: new Date(Date.now() - 86_400_000) } } });
    if (pending >= 30) return NextResponse.json({ error: "Upload limit reached for today." }, { status: 429 });
  } else if (purpose === "SELLER_DOCUMENT" || purpose === "PORTFOLIO") {
    const m = user ? membershipOf(user, "SELLER") : null;
    if (!m) return NextResponse.json({ error: "Seller account required." }, { status: 403 });
    ownerOrgId = m.orgId;
  } else {
    if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    ownerOrgId = membershipOf(user, "SELLER")?.orgId ?? membershipOf(user, "BUYER")?.orgId ?? null;
  }

  const safeName = sanitizeFilename(filename);
  const now = new Date();
  const att = await prisma.attachment.create({
    data: {
      purpose, storageKey: `pending/${randomToken(16)}`, originalFilename: filename.slice(0, 255), sanitizedFilename: safeName, mimeType: v.mime, extension: v.ext,
      sizeBytes: size, uploaderUserId: user?.id ?? null, ownerOrgId, guestOwnerHash: guestHash,
    },
  });
  const key = `${purpose.toLowerCase()}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${att.id}/${randomToken(6)}.${v.ext}`;
  await prisma.attachment.update({ where: { id: att.id }, data: { storageKey: key } });
  const upload = await storage().createUploadUrl(key, v.mime, PURPOSE_RULES[purpose].maxMb * 1_048_576);
  return NextResponse.json({ id: att.id, upload, filename: safeName });
}
