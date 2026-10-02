import { NextResponse } from "next/server";
import { search } from "@/lib/search";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

export async function GET(req: Request) {
  const rl = rateLimit(`search:${await clientIp()}`, LIMITS.api.limit, LIMITS.api.windowMs);
  if (!rl.ok) return NextResponse.json({ results: [] }, { status: 429 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json({ results: await search(q) }, { headers: { "Cache-Control": "public, max-age=60" } });
}
