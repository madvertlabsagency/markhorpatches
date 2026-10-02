// Applies migrations to the TEST database (non-destructive). Tests use unique data per run,
// so no reset is needed. To start completely fresh, drop/recreate the test database yourself.
import "dotenv/config";
import { execSync } from "node:child_process";

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.error("TEST_DATABASE_URL is not set");
  process.exit(1);
}
if (url === process.env.DATABASE_URL) {
  console.error("Refusing: TEST_DATABASE_URL must differ from DATABASE_URL");
  process.exit(1);
}
execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
