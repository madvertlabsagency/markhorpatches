import "server-only";
import { timingSafeEqual } from "node:crypto";

/** Cron endpoints require `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this automatically). */
export function authorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}
