import "dotenv/config";
import { defineConfig } from "prisma/config";
import { databaseUrl } from "./src/lib/database-url";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // `prisma generate` needs no live database, so builds succeed before DATABASE_URL is set.
    url: databaseUrl() ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
