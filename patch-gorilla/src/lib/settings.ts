import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { DEFAULT_SETTINGS, settingsSchemas, type Settings, type SettingsKey } from "./settings-schema";

export { DEFAULT_SETTINGS, settingsSchemas, type Settings, type SettingsKey };

export async function loadSettings(): Promise<Settings> {
  const rows = await prisma.siteSetting.findMany();
  const out = structuredClone(DEFAULT_SETTINGS) as Settings;
  for (const row of rows) {
    const key = row.key as SettingsKey;
    if (!(key in settingsSchemas)) continue;
    const parsed = settingsSchemas[key].safeParse({ ...(DEFAULT_SETTINGS[key] as object), ...(row.value as object) });
    if (parsed.success) (out as Record<string, unknown>)[key] = parsed.data;
  }
  // Env fallbacks (admin values win when set)
  if (!out.brand.whatsappNumber && process.env.NEXT_PUBLIC_WHATSAPP_NUMBER) out.brand.whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER.replace(/\D/g, "");
  if (!out.brand.supportEmail && process.env.NEXT_PUBLIC_SUPPORT_EMAIL) out.brand.supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  return out;
}

export const getSettings = unstable_cache(loadSettings, ["site-settings"], { tags: ["settings"], revalidate: 300 });

export async function saveSetting<K extends SettingsKey>(key: K, value: Settings[K]) {
  const parsed = settingsSchemas[key].parse(value);
  await prisma.siteSetting.upsert({ where: { key }, create: { key, value: parsed as object }, update: { value: parsed as object } });
  revalidateTag("settings", "max");
}
