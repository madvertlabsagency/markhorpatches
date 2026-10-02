import "server-only";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 characters"),
  DATABASE_URL: z.string().min(1),
  PAYMENTS_PROVIDER: z.enum(["stripe", "mock"]).default("mock"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_AUTOMATIC_TAX: z.string().optional(),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["console", "resend", "postmark"]).default("console"),
  EMAIL_FROM: z.string().default("Patch Gorilla <hello@example.com>"),
  EMAIL_REPLY_TO: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  POSTMARK_SERVER_TOKEN: z.string().optional(),
  OPS_NOTIFICATION_EMAIL: z.string().optional(),
  GHL_API_KEY: z.string().optional(),
  GHL_LOCATION_ID: z.string().optional(),
  GHL_PIPELINE_ID: z.string().optional(),
  GHL_STAGE_NEW_LEAD: z.string().optional(),
  GHL_STAGE_MOCKUP: z.string().optional(),
  GHL_STAGE_PROOF_READY: z.string().optional(),
  GHL_STAGE_APPROVED: z.string().optional(),
  GHL_STAGE_WON: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/** Validated server environment. Throws with a readable message on misconfiguration. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error("Invalid environment configuration:\n" + parsed.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n"));
  }
  if (parsed.data.NODE_ENV === "production" && parsed.data.PAYMENTS_PROVIDER === "mock" && process.env.ALLOW_MOCK_PAYMENTS !== "true") {
    throw new Error("PAYMENTS_PROVIDER=mock is not allowed in production. Configure Stripe.");
  }
  cached = parsed.data;
  return cached;
}

export function siteUrl(path = "") {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}
