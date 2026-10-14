import { prisma } from "@/lib/db";
import { seed } from "../../prisma/seed";

let seeded = false;
export async function ensureSeeded() {
  if (seeded) return;
  await seed(prisma as never, { sampleContent: false, log: false });
  seeded = true;
}

export async function catalogIds() {
  const types = await prisma.patchType.findMany();
  const backings = await prisma.backingOption.findMany();
  const borders = await prisma.borderOption.findMany();
  const extras = await prisma.extraOption.findMany();
  const t = (c: string) => types.find((x) => x.code === c)!.id;
  const b = (c: string) => backings.find((x) => x.code === c)!.id;
  const br = (c: string) => borders.find((x) => x.code === c)!.id;
  const e = (c: string) => extras.find((x) => x.code === c)!.id;
  return { t, b, br, e };
}

export const address = {
  firstName: "Test", lastName: "Customer", line1: "100 Main St", city: "Austin", state: "TX", postalCode: "78701", country: "US" as const,
};

export async function staffUser() {
  return prisma.user.upsert({ where: { email: "designer@test.local" }, create: { email: "designer@test.local", role: "DESIGNER" }, update: {} });
}
