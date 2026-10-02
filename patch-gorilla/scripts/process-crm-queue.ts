/** CLI retry worker: `npm run jobs:crm-retry` (e.g. from a system cron every 5 minutes). */
import "dotenv/config";
import { processCrmQueue } from "../src/lib/services/crm";

processCrmQueue(200)
  .then((n) => {
    console.log(`Processed ${n} CRM event(s)`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
