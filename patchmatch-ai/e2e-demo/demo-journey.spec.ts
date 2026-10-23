import { expect, test, type Page } from "@playwright/test";

const banner = (page: Page) => expect(page.getByRole("note", { name: "Demo mode" })).toContainText("DEMO MODE — SIMULATED ACTIVITY");

test("final acceptance journey in demo mode", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // Public site: buyer-first homepage, clearly marked as a demo.
  await page.goto("/");
  await banner(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("The Right Manufacturer.");
  await expect(page.getByRole("link", { name: /Get Free Patch Quotes/ }).first()).toBeVisible();

  // Admin persona → Demo control center → run scenario A (RFQ → unlock → quote → chat → selection).
  await page.goto("/demo/admin");
  await page.waitForURL("**/admin/demo", { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Demo control center" })).toBeVisible();
  await expect(page.getByText("SIMULATED DEMO METRICS — NOT ACTUAL BUSINESS PERFORMANCE")).toBeVisible();
  const scenarioA = page.locator("li", { hasText: "Successful buyer journey" });
  await scenarioA.getByRole("button", { name: "Run" }).click();
  await expect(page.getByText(/Scenario A complete on PM-DEMO-\d{4}/)).toBeVisible({ timeout: 90_000 });
  const ref = (await page.getByText(/Scenario A complete on PM-DEMO-\d{4}/).textContent())!.match(/PM-DEMO-\d{4}/)![0];

  // Generate activity buttons respond with a result.
  await page.getByRole("button", { name: /Generate buyer request/ }).click();
  await expect(page.getByText(/New simulated RFQ PM-DEMO-\d{4}/)).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByText("Simulation paused")).toBeVisible();
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByText("Simulation started.")).toBeVisible();

  // Buyer persona sees the selected manufacturer and the project tracker.
  await page.goto("/demo/buyer");
  await page.waitForURL("**/buyer/dashboard", { timeout: 60_000 });
  await banner(page);
  await page.goto("/buyer/rfqs");
  await page.getByRole("link", { name: new RegExp(ref) }).first().click();
  await expect(page.getByText(ref).first()).toBeVisible();
  await expect(page.getByText(/Markhor Stitch Works/).first()).toBeVisible();

  // Manufacturer persona sees the unlocked request and the conversation.
  await page.goto("/demo/manufacturer");
  await page.waitForURL("**/seller/opportunities", { timeout: 60_000 });
  await banner(page);
  await page.goto("/seller/messages");
  await expect(page.getByText(ref).first()).toBeVisible();

  expect(errors).toEqual([]);
});
