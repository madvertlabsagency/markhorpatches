import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { emailSendingEnabled, isDemoMode } from "@/lib/env";
import { storageDriver } from "@/lib/services/storage";

export const dynamic = "force-dynamic";

/**
 * Deployment check: which version is live and which integrations are switched on.
 * Booleans and names only — never secrets or connection details.
 */
export async function GET() {
  let database = false;
  let demoBaseline: number | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
    const v = await prisma.platformSetting.findUnique({ where: { key: "demo.version" } });
    demoBaseline = (v?.value as { version?: number } | null)?.version ?? null;
  } catch {}
  return NextResponse.json({
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    demoMode: isDemoMode(),
    demoBaseline,
    database,
    emailSending: emailSendingEnabled() ? process.env.EMAIL_PROVIDER : "off (console only)",
    storage: storageDriver(),
    cronSecret: !!process.env.CRON_SECRET,
  });
}
