import { NextResponse } from "next/server";
import { authorizedCron } from "@/lib/cron";
import { runJobs } from "@/lib/jobs/queue";
import { JOB_HANDLERS } from "@/lib/jobs/handlers";

export const maxDuration = 60;

/** Processes queued background jobs (emails, qualification, matching, AI enrichment). */
export async function GET(req: Request) {
  if (!authorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const results = [];
  const started = Date.now();
  while (Date.now() - started < 45_000) {
    const batch = await runJobs(JOB_HANDLERS, 20);
    results.push(...batch);
    if (batch.length < 20) break;
  }
  return NextResponse.json({ processed: results.length, failed: results.filter((r) => !r.ok).length });
}
