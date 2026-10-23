import { execSync } from "node:child_process";

export default function globalSetup() {
  const env = { ...process.env, DATABASE_URL: process.env.E2E_DEMO_DATABASE_URL, DEMO_MODE: "true" };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env });
  execSync("npx tsx --conditions=react-server prisma/seed-demo.ts --force", { stdio: "inherit", env });
}
