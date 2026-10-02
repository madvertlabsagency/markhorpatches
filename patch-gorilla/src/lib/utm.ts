import "server-only";
import { cookies } from "next/headers";

/** Server-side read of the first-touch UTM cookie. */
export async function getUtm(): Promise<Record<string, string> | null> {
  const raw = (await cookies()).get("pg_utm")?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) if (typeof v === "string" && /^[a-z_]+$/.test(k)) out[k] = v.slice(0, 120);
    return out;
  } catch {
    return null;
  }
}
