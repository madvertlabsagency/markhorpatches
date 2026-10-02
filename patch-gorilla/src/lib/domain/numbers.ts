import "server-only";
import { randomInt } from "node:crypto";

/** Human-friendly unique references: PG-482915, MR-…, QT-… (uniqueness enforced by DB constraint + retry). */
export function makeRef(prefix: "PG" | "MR" | "QT"): string {
  return `${prefix}-${randomInt(100000, 999999)}`;
}

export async function withUniqueRef<T>(prefix: "PG" | "MR" | "QT", create: (ref: string) => Promise<T>): Promise<T> {
  for (let i = 0; i < 6; i++) {
    try {
      return await create(makeRef(prefix));
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  throw new Error("Could not allocate a unique reference");
}
