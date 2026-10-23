import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const DB = process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/patchmatch_e2e";
process.env.E2E_DATABASE_URL = DB;

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || undefined },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, grepInvert: /@mobile/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: { DATABASE_URL: DB, PAYMENTS_PROVIDER: "sandbox", ALLOW_SANDBOX_PAYMENTS: "true", ADMIN_MFA_REQUIRED: "false", EMAIL_PROVIDER: "console", AI_PROVIDER: "rules", NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}` },
    timeout: 180_000,
  },
});
