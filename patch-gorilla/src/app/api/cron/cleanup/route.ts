import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizedCron } from "@/lib/cron";
import { storage } from "@/lib/services/storage";

/** Housekeeping: expired sessions, stale pending uploads, abandoned anonymous carts. */
export async function GET(req: Request) {
  if (!authorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const day = 86_400_000;
  const sessions = await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const stale = await prisma.artworkFile.findMany({ where: { status: { in: ["PENDING_UPLOAD", "REJECTED"] }, createdAt: { lt: new Date(Date.now() - day) } }, take: 500 });
  for (const f of stale) await storage().delete(f.storageKey).catch(() => {});
  await prisma.artworkFile.deleteMany({ where: { id: { in: stale.map((f) => f.id) } } });
  const carts = await prisma.cart.updateMany({ where: { status: "ACTIVE", customerId: null, email: null, updatedAt: { lt: new Date(Date.now() - 60 * day) } }, data: { status: "ABANDONED" } });
  return NextResponse.json({ sessions: sessions.count, uploads: stale.length, carts: carts.count });
}
