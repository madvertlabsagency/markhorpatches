import path from "node:path";
import { expect, test } from "@playwright/test";

test("guest submits a complete RFQ with artwork and gets a tracking link", async ({ page }) => {
  await page.goto("/get-quotes?type=EMBROIDERED&qty=300");
  const next = () => page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("radio", { name: /Embroidered/ })).toHaveAttribute("aria-checked", "true");
  // 1 · Patch type + use
  await page.getByRole("radio", { name: /Clothing brand/ }).click();
  await next();
  // 2 · Quantity (prefilled from the quick-start link)
  await expect(page.locator("#quantity")).toHaveValue("300");
  await next();
  // 3 · Size
  await page.fill("#width", "3");
  await page.fill("#height", "2.5");
  await next();
  // 4 · Artwork
  await page.locator('input[type="file"]').setInputFiles(path.resolve("e2e/fixtures/logo.png"));
  await expect(page.getByText("Verified", { exact: false }).first()).toBeVisible({ timeout: 30_000 });
  await next();
  // 5 · Backing
  await page.getByRole("radio", { name: /Iron-on/ }).click();
  await page.fill("#colorCount", "4");
  await next();
  // 6 · Budget
  await page.getByLabel("I prefer not to disclose a budget").check();
  await next();
  // 7 · Delivery
  await page.selectOption("#destinationState", "CA");
  await page.fill("#destinationPostal", "90012");
  await next();
  // 8 · Buying stage
  await page.getByRole("radio", { name: /Planning to order within 30 days/ }).click();
  await next();
  // Validation blocks an invalid email.
  await page.fill("#contactName", "Playwright Buyer");
  await page.fill("#contactEmail", "not-an-email");
  await next();
  await expect(page.getByText("Enter a valid email address")).toBeVisible();
  await page.fill("#contactEmail", `wizard-${Date.now()}@e2e.test`);
  await next();
  // 10 · Privacy: platform messaging only is the default; B/C need the separate direct-contact consent.
  await expect(page.getByRole("radio", { name: /A\. Keep my contact details private/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: /^C\./ }).click();
  await next();
  await expect(page.locator("#consentDirectContact")).toBeVisible();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await page.getByRole("radio", { name: /A\. Keep my contact details private/ }).click();
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
