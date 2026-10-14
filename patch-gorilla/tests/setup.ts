import "dotenv/config";

// Integration tests run against a disposable database.
if (process.env.VITEST_INTEGRATION === "1") {
  if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required for integration tests");
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
process.env.EMAIL_PROVIDER = "console";
process.env.PAYMENTS_PROVIDER = "mock";
process.env.GHL_API_KEY = "";
