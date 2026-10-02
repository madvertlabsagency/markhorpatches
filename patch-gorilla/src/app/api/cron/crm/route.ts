import { NextResponse } from "next/server";
import { authorizedCron } from "@/lib/cron";
import { processCrmQueue } from "@/lib/services/crm";

/** Retry worker for the GoHighLevel outbox (exponential backoff, dead-letter after 6 attempts). */
export async function GET(req: Request) {
  if (!authorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const processed = await processCrmQueue(100);
  return NextResponse.json({ processed });
}
