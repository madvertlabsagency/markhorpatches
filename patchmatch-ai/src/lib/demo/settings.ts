import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/env";

/** Demo simulation controls (Admin → Demo control center). Rates are per hour of wall-clock time. */
export const demoSimSchema = z.object({
  enabled: z.boolean().default(true),
  rfqsPerHour: z.number().int().min(0).max(600).default(40),
  claimsPerHour: z.number().int().min(0).max(600).default(20),
  quotesPerHour: z.number().int().min(0).max(600).default(20),
  messagesPerHour: z.number().int().min(0).max(600).default(20),
  ordersPerHour: z.number().int().min(0).max(300).default(6),
  applicationsPerHour: z.number().int().min(0).max(300).default(6),
});
export type DemoSimSettings = z.infer<typeof demoSimSchema>;

export const DEMO_PRESETS: Record<string, { label: string; value: Omit<DemoSimSettings, "enabled"> }> = {
  calm: { label: "Calm (realistic pilot pace)", value: { rfqsPerHour: 6, claimsPerHour: 3, quotesPerHour: 3, messagesPerHour: 4, ordersPerHour: 1, applicationsPerHour: 1 } },
  busy: { label: "Busy marketplace", value: { rfqsPerHour: 40, claimsPerHour: 20, quotesPerHour: 20, messagesPerHour: 20, ordersPerHour: 6, applicationsPerHour: 6 } },
  showcase: { label: "Showcase (fast, for live presentations)", value: { rfqsPerHour: 240, claimsPerHour: 120, quotesPerHour: 120, messagesPerHour: 120, ordersPerHour: 30, applicationsPerHour: 30 } },
};

export async function demoSimSettings(): Promise<DemoSimSettings> {
  const row = await prisma.platformSetting.findUnique({ where: { key: "demo.sim" } }).catch(() => null);
  const parsed = demoSimSchema.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : demoSimSchema.parse({});
}

export async function saveDemoSimSettings(v: DemoSimSettings) {
  assertDemo();
  const value = demoSimSchema.parse(v);
  await prisma.platformSetting.upsert({ where: { key: "demo.sim" }, create: { key: "demo.sim", value }, update: { value } });
  return value;
}

/** Every demo mutation calls this: demo tools never run against a production deployment. */
export function assertDemo() {
  if (!isDemoMode()) throw new Error("Demo tools are only available when DEMO_MODE=true.");
}
