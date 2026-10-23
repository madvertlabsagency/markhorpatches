import { NextResponse } from "next/server";
import { authorizedCron } from "@/lib/cron";
import { expireReservations } from "@/lib/domain/unlock";
import { prisma } from "@/lib/db";

/** Expires reservations/opportunities/RFQs and purges orphaned pending uploads. */
export async function GET(req: Request) {
  if (!authorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const r = await expireReservations();
  const staleUploads = await prisma.attachment.updateMany({ where: { status: "PENDING", createdAt: { lt: new Date(Date.now() - 86_400_000) } }, data: { status: "DELETED", deletedAt: new Date() } });
  const expiredRfqs = await prisma.rfq.updateMany({ where: { status: { in: ["VERIFICATION_PENDING"] }, createdAt: { lt: new Date(Date.now() - 14 * 86_400_000) } }, data: { status: "EXPIRED", closedAt: new Date() } });
  return NextResponse.json({ ...r, staleUploads: staleUploads.count, expiredUnverifiedRfqs: expiredRfqs.count });
}
