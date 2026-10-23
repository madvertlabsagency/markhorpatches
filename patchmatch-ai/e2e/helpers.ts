import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

export interface Fixture { password: string; admin: string; sellerA: string; outsider: string; buyer: string; otherBuyer: string; rfqId: string; rfqRef: string }
export const fx = (): Fixture => JSON.parse(readFileSync("e2e/.fixture.json", "utf8"));

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login")), page.getByRole("button", { name: "Sign in" }).click()]);
}
