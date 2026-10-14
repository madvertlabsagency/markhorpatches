/**
 * Postgres connection string. Vercel's Neon/Postgres integrations may expose it as
 * POSTGRES_PRISMA_URL or POSTGRES_URL instead of DATABASE_URL, optionally with a custom
 * prefix (e.g. STORAGE_DATABASE_URL), so accept any of those.
 */
const SUFFIXES = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"];

export function databaseUrl(): string | undefined {
  for (const suffix of SUFFIXES) {
    if (process.env[suffix]) return process.env[suffix];
  }
  for (const suffix of SUFFIXES) {
    const key = Object.keys(process.env).find((k) => k.endsWith(`_${suffix}`) && !k.startsWith("TEST_") && process.env[k]);
    if (key) return process.env[key];
  }
  return undefined;
}
