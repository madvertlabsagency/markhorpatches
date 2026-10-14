/**
 * Postgres connection string. Vercel's Neon/Postgres integrations may expose it as
 * POSTGRES_PRISMA_URL or POSTGRES_URL instead of DATABASE_URL, so accept any of them.
 */
export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || undefined;
}
