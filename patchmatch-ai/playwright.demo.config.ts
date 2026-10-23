import { defineConfig, devices } from "@playwright/test";

/** Demo-mode acceptance journey: a separate server with DEMO_MODE=true on its own database. */
const PORT = Number(process.env.E2E_DEMO_PORT ?? 3200);
const DB = process.env.E2E_DEMO_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/patchmatch_e2e_demo";
process.env.E2E_DEMO_DATABASE_URL = DB;

export default defineConfig({
  testDir: "./e2e-demo",
  timeout: 180_000,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./e2e-demo/global-setup.ts",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || undefined }, ...devices["Desktop Chrome"] },
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: { DATABASE_URL: DB, DEMO_MODE: "true", PAYMENTS_PROVIDER: "sandbox", ALLOW_SANDBOX_PAYMENTS: "true", ADMIN_MFA_REQUIRED: "false", EMAIL_PROVIDER: "console", AI_PROVIDER: "rules", NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}` },
    timeout: 180_000,
  },
});
