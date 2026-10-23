import "server-only";
import { z } from "zod";
import { databaseUrl } from "@/lib/database-url";

export const PAYMENT_PROVIDERS = ["sandbox", "manual", "safepay", "payfast", "faysal"] as const;
export type PaymentProviderName = (typeof PAYMENT_PROVIDERS)[number];

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 characters"),
  DATABASE_URL: z.string().min(1),
  PAYMENTS_PROVIDER: z.enum(PAYMENT_PROVIDERS).default("sandbox"),
  ALLOW_SANDBOX_PAYMENTS: z.string().optional(),
  SANDBOX_WEBHOOK_SECRET: z.string().optional(),
  STORAGE_DRIVER: z.enum(["local", "s3", "vercel-blob"]).optional(),
  S3_BUCKET: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["console", "resend", "postmark"]).default("console"),
  EMAIL_FROM: z.string().default("PatchMatch AI <hello@example.com>"),
  AI_PROVIDER: z.enum(["rules", "anthropic"]).default("rules"),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  ADMIN_MFA_REQUIRED: z.string().optional(),
  DEMO_MODE: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/** Validated server environment. Throws with a readable message on misconfiguration. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse({ ...process.env, DATABASE_URL: databaseUrl() });
  if (!parsed.success) {
    throw new Error("Invalid environment configuration:\n" + parsed.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n"));
  }
  if (parsed.data.NODE_ENV === "production" && parsed.data.PAYMENTS_PROVIDER === "sandbox" && parsed.data.ALLOW_SANDBOX_PAYMENTS !== "true") {
    throw new Error("PAYMENTS_PROVIDER=sandbox is not allowed in production. Configure an approved provider or set PAYMENTS_PROVIDER=manual.");
  }
  cached = parsed.data;
  return cached;
}

export function siteUrl(path = "") {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

export const isDemoMode = () => process.env.DEMO_MODE === "true";

/** Admin MFA is enforced in production unless explicitly disabled (never recommended). */
export const adminMfaRequired = () => (process.env.ADMIN_MFA_REQUIRED ?? (process.env.NODE_ENV === "production" ? "true" : "false")) === "true";
