/** Runs every Demo Control Center action once against a demo database (DEMO_MODE=true). */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import * as e from "../src/lib/demo/engine";

async function main() {
  const ops: [string, () => Promise<e.DemoResult>][] = [
    ["buyer", () => e.genBuyerRequest()], ["manufacturer", () => e.genApplication()], ["unlock", () => e.simulateSellerUnlock()], ["quote", () => e.simulateQuote()],
    ["reply", () => e.simulateBuyerReply()], ["order", () => e.simulateOrder()], ["claim", () => e.simulateQualityClaim()], ["noResponse", () => e.simulateNoResponse()],
    ...(["A", "B", "C", "D", "E", "F"] as const).map((k) => [`scenario ${k}`, () => e.runScenario(k)] as [string, () => Promise<e.DemoResult>]),
    ["seed10", () => e.seedRfqs(10)], ["reset", () => e.resetSimulation()],
  ];
  let failed = 0;
  for (const [name, fn] of ops) {
    try {
      const r = await fn();
      if (!r.ok) failed++;
      console.log(`${r.ok ? "OK  " : "FAIL"} ${name}: ${r.message}`);
    } catch (err) {
      failed++;
      console.log(`ERR  ${name}: ${(err as Error).stack}`);
    }
  }
  const emails = await prisma.backgroundJob.count({ where: { type: "email.send" } });
  console.log(`email jobs queued: ${emails}`);
  process.exit(failed ? 1 : 0);
}
main();
