/** Process the background job queue from the CLI (e.g. a worker dyno or local development). */
import "dotenv/config";
import { runJobs } from "../src/lib/jobs/queue";
import { JOB_HANDLERS } from "../src/lib/jobs/handlers";

const loop = process.argv.includes("--watch");
async function main() {
  do {
    const r = await runJobs(JOB_HANDLERS, 25);
    if (r.length) console.log(`[jobs] processed ${r.length} (${r.filter((x) => !x.ok).length} failed)`);
    if (loop) await new Promise((res) => setTimeout(res, 5000));
  } while (loop);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
