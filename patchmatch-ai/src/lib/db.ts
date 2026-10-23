import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { databaseUrl } from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = databaseUrl();
  if (!connectionString && process.env.VERCEL) {
    const candidates = Object.keys(process.env).filter((k) => /DATABASE|POSTGRES|PG/.test(k));
    console.error(`No database URL found. Set DATABASE_URL for this environment. Database-like variables present: ${candidates.join(", ") || "none"}`);
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter, log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });
}

export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
