import { NextResponse } from "next/server";
import { authorizedCron } from "@/lib/cron";
import { isDemoMode } from "@/lib/env";
import { maybeSimulate } from "@/lib/demo/engine";

/**
 * Demo marketplace heartbeat (DEMO_MODE=true only). Vercel Hobby crons run daily, so schedule this
 * every minute from any external scheduler with `Authorization: Bearer $CRON_SECRET` to keep the demo
 * moving with no browser open. Live-feed polls drive the same rate-limited simulation step.
 */
export async function GET(req: Request) {
  if (!authorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDemoMode()) return NextResponse.json({ skipped: "not a demo deployment" });
  return NextResponse.json(await maybeSimulate());
}
