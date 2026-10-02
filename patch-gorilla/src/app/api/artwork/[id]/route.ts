import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/services/storage";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";
import { ownerContext } from "@/lib/cart-session";

/** Authorized artwork download → short-lived signed URL. Staff, or the owning customer/browser only. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await prisma.artworkFile.findUnique({ where: { id } });
  if (!file || file.status !== "UPLOADED") return new NextResponse(null, { status: 404 });
  const user = await getCurrentUser();
  const owner = await ownerContext();
  const allowed = isStaff(user?.role) || (owner.customerId && file.customerId === owner.customerId) || (owner.anonOwnerId && file.anonOwnerId === owner.anonOwnerId);
  if (!allowed) return new NextResponse(null, { status: 404 });
  const url = await storage().getDownloadUrl(file.storageKey, { filename: file.sanitizedFilename, expiresIn: 300 });
  return NextResponse.redirect(url);
}
