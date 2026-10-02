import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizedCron } from "@/lib/cron";
import { emit } from "@/lib/events";
import { processCrmQueue } from "@/lib/services/crm";

/** Carts with an email + items, idle 4–72h, not yet followed up. Email only with consent; CRM event regardless (contact captured). */
export async function GET(req: Request) {
  if (!authorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = Date.now();
  const carts = await prisma.cart.findMany({
    where: { status: "ACTIVE", email: { not: null }, abandonedEmailSent: false, updatedAt: { lte: new Date(now - 4 * 3_600_000), gte: new Date(now - 72 * 3_600_000) }, items: { some: { savedForLater: false } } },
    take: 100,
    select: { id: true },
  });
  for (const c of carts) {
    await emit({ type: "configurator.abandoned", cartId: c.id });
    await prisma.cart.update({ where: { id: c.id }, data: { abandonedEmailSent: true } });
  }
  await processCrmQueue(100);
  return NextResponse.json({ followedUp: carts.length });
}
