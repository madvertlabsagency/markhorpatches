import { expect, test } from "@playwright/test";
import { buildPatch, checkout } from "./helpers";

test("customer builds a patch, uploads artwork, adds to cart and checks out", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  await buildPatch(page);
  await expect(page.getByRole("heading", { name: "Your patches." })).toBeVisible();
  await expect(page.getByText("Embroidered Patches").first()).toBeVisible();
  // 3" × 200 embroidered + iron-on = (2.15 + 0.15) × 200 = $460.00
  await expect(page.getByText("$460.00").first()).toBeVisible();
  await checkout(page, email);
  await expect(page.getByRole("heading", { name: /Thank you/ })).toBeVisible();
  await expect(page.getByText("Paid", { exact: true })).toBeVisible();
  await expect(page.getByText("Proof in progress")).toBeVisible();
});

test("homepage renders key sections @mobile", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Custom patches");
  await expect(page.getByRole("link", { name: /Get a free mockup/i }).first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
