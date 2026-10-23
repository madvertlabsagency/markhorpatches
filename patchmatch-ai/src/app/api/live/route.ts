import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";
import { recentActivity, marketplaceStats } from "@/lib/activity";
import { maybeSimulate } from "@/lib/demo/simulator";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

export const dynamic = "force-dynamic";

/**
 * Live marketplace feed (polled every few seconds by the homepage, /live, and dashboards).
 * Public scope: anonymised events only. Admin scope (staff): also internal events such as which
 * manufacturer viewed which request. Signed-in users also receive their own new notifications.
 * In demo mode each poll may advance the demo simulator by one tick (after the response is sent).
 */
export async function GET(req: Request) {
  const ip = await clientIp();
  if (!rateLimit(`live:${ip}`, LIMITS.api.limit, LIMITS.api.windowMs).ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const url = new URL(req.url);
  const parseDate = (v: string | null) => {
    const d = v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? d : undefined;
  };
  const afterAt = parseDate(url.searchParams.get("after"));
  const notifAfter = parseDate(url.searchParams.get("notifAfter"));
  const scope = url.searchParams.get("scope") === "admin" ? "admin" : "public";
  const minUsd = Number(url.searchParams.get("min") ?? 0);
  const demo = isDemoMode();

  const user = await getCurrentUser().catch(() => null);
  if (scope === "admin" && !(user && isStaff(user.platformRole))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [events, stats, mine] = await Promise.all([
    recentActivity({ demo, includePrivate: scope === "admin", after: afterAt, limit: afterAt ? 20 : 30, minValueMinor: minUsd > 0 ? Math.round(minUsd * 100) : undefined }),
    marketplaceStats(demo),
    user && notifAfter
      ? prisma.notification.findMany({ where: { userId: user.id, createdAt: { gt: notifAfter } }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, title: true, body: true, link: true, createdAt: true } })
      : Promise.resolve([]),
  ]);

  if (demo) after(() => maybeSimulate());
  return NextResponse.json({ demo, now: new Date().toISOString(), events, stats, notifications: mine }, { headers: { "Cache-Control": "no-store" } });
}
