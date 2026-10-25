/**
 * DEMO ENVIRONMENT SEED — fictional data only (see src/lib/demo/baseline.ts).
 *
 *  • 3 presenter accounts, 60 fictional manufacturers, 30 fictional US buyers and ~120
 *    PM-DEMO-#### requests pushed through the real pipeline. Every record is isDemo=true and every
 *    page shows the "DEMO MODE — SIMULATED ACTIVITY" banner. Production reporting excludes isDemo data.
 *  • Idempotent: skips when the current baseline is present; an older demo dataset is wiped first.
 *  • Run ONLY against a dedicated demo database.
 *
 * Usage: DEMO_MODE=true npm run db:seed:demo          (refuses unless DEMO_MODE=true)
 *        npm run db:seed:demo -- --if-demo            (no-op unless DEMO_MODE=true; used by vercel-build)
 *        npm run db:seed:demo -- --force              (wipe and reseed the demo baseline)
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import { DEMO_BASELINE_VERSION, demoBaselineVersion, seedDemoBaseline, wipeDemoData } from "../src/lib/demo/baseline";
import { DEMO_ACCOUNTS, DEMO_PASSWORD_DEFAULT } from "../src/lib/demo/catalog";

const IF_DEMO = process.argv.includes("--if-demo");
const FORCE = process.argv.includes("--force");
if (process.env.DEMO_MODE !== "true") {
  if (IF_DEMO) process.exit(0);
  console.error("Refusing to seed demo data: set DEMO_MODE=true and point DATABASE_URL at a dedicated demo database.");
  process.exit(1);
}

async function main() {
  const version = await demoBaselineVersion();
  if (version === DEMO_BASELINE_VERSION && !FORCE) {
    console.log("[demo] Demo baseline already present — skipping (pass --force to reseed).");
    return;
  }
  if (FORCE || version !== null || (await prisma.user.count({ where: { isDemo: true } })) > 0) {
    console.log("[demo] Replacing the existing demo dataset…");
    await wipeDemoData(console.log);
  }
  const passwordHash = await bcrypt.hash(process.env.DEMO_PASSWORD ?? DEMO_PASSWORD_DEFAULT, 10);
  await seedDemoBaseline({ passwordHash, log: console.log });
  console.log(`[demo] Sign in as ${DEMO_ACCOUNTS.admin.email} / ${DEMO_ACCOUNTS.seller.email} / ${DEMO_ACCOUNTS.buyer.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
