import path from "node:path";
import { expect, test } from "@playwright/test";

test("guest submits a complete RFQ with artwork and gets a tracking link", async ({ page }) => {
  await page.goto("/get-quotes?type=EMBROIDERED&qty=300");
  const next = () => page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("radio", { name: /Embroidered/ })).toHaveAttribute("aria-checked", "true");
  await next();
  await page.getByRole("radio", { name: /Clothing brand/ }).click();
  await next();
  await page.fill("#width", "3");
  await page.fill("#height", "2.5");
  await next();
  await expect(page.locator("#quantity")).toHaveValue("300");
  await next();
  await page.getByRole("radio", { name: /Iron-on/ }).click();
  await page.fill("#colorCount", "4");
  await next();
  await page.locator('input[type="file"]').setInputFiles(path.resolve("e2e/fixtures/logo.png"));
  await expect(page.getByText("Verified", { exact: false }).first()).toBeVisible({ timeout: 30_000 });
  await next();
  await page.selectOption("#destinationState", "CA");
  await page.fill("#destinationPostal", "90012");
  await next();
  await page.getByLabel("I prefer not to disclose a budget").check();
  await next();
  // Validation blocks an invalid email.
  await page.fill("#contactName", "Playwright Buyer");
  await page.fill("#contactEmail", "not-an-email");
  await next();
  await expect(page.getByText("Enter a valid email address")).toBeVisible();
  await page.fill("#contactEmail", `wizard-${Date.now()}@e2e.test`);
  await next();
  // Review: consent is required; marketing is unchecked by default.
  await expect(page.locator("#consentMarketing")).not.toBeChecked();
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByText("You must agree to supplier matching")).toBeVisible();
  await page.locator("#consentMatching").check();
  await page.locator("#consentSharing").check();
  await page.locator("#consentTerms").check();
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByRole("heading", { name: "Request received" })).toBeVisible({ timeout: 30_000 });
  const ref = (await page.locator("p.tabular").first().textContent())?.trim();
  expect(ref).toMatch(/^PM-[A-Z0-9]{6}$/);
  await page.getByRole("link", { name: "Open tracking page" }).click();
  await expect(page.getByText(`Request ${ref}`)).toBeVisible();
  await expect(page.getByText("Verification pending").first()).toBeVisible();
});
