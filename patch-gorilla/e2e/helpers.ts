import { expect, type Page } from "@playwright/test";
import path from "node:path";

export const ARTWORK = path.join(import.meta.dirname, "fixtures", "logo.png");

/** Builds an embroidered patch through every configurator step and adds it to the cart. */
export async function buildPatch(page: Page, opts: { mobile?: boolean } = {}) {
  await page.goto("/build-your-patch?type=EMBROIDERED");
  await expect(page.getByRole("heading", { name: "Add your artwork" })).toBeVisible();
  await page.setInputFiles('input[type="file"]', ARTWORK);
  await expect(page.getByText("Artwork received")).toBeVisible({ timeout: 20_000 });
  const next = async () => {
    if (opts.mobile) await page.getByRole("button", { name: /^Next/ }).click();
    else await page.getByRole("button", { name: "Continue" }).click();
  };
  await next();
  await expect(page.getByRole("heading", { name: "Pick a size" })).toBeVisible();
  await next();
  await expect(page.getByRole("heading", { name: "How many?" })).toBeVisible();
  await page.getByRole("radio", { name: /^200/ }).click();
  await next();
  await page.getByRole("radio", { name: "Circle" }).click();
  await next();
  await page.getByRole("radio", { name: "Iron-On" }).click();
  await next();
  await page.getByRole("radio", { name: "Merrowed" }).click();
  await next();
  await expect(page.getByRole("heading", { name: "Add extras" })).toBeVisible();
  await next();
  await expect(page.getByRole("heading", { name: "Review your patch" })).toBeVisible();
  if (opts.mobile) await page.getByRole("button", { name: /^Add/ }).click();
  else await page.getByRole("button", { name: /Add to cart/ }).click();
  await page.waitForURL("**/cart");
}

export async function checkout(page: Page, email: string) {
  await page.getByRole("link", { name: /Checkout/ }).click();
  await page.waitForURL("**/checkout");
  await page.getByLabel("First name").first().fill("Casey");
  await page.getByLabel("Last name").first().fill("Customer");
  await page.getByLabel("Email").fill(email);
  await page.locator("#shipping-fn").fill("Casey");
  await page.locator("#shipping-ln").fill("Customer");
  await page.locator("#shipping-l1").fill("100 Congress Ave");
  await page.locator("#shipping-city").fill("Austin");
  await page.locator("#shipping-st").selectOption("TX");
  await page.locator("#shipping-zip").fill("78701");
  await page.getByRole("button", { name: /Continue to payment/ }).click();
  await page.waitForURL("**/checkout/mock-pay**");
  await page.getByRole("button", { name: /^Pay/ }).click();
  await page.waitForURL("**/order/**");
}
