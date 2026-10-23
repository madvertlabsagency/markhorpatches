import { expect, test } from "@playwright/test";
import { fx, login } from "./helpers";

test("seller sees anonymised preview, failed payment keeps it locked, verified payment unlocks, quote reaches buyer", async ({ page, browser }) => {
  const f = fx();
  await login(page, f.sellerA, f.password);
  await page.goto(`/seller/opportunities/${f.rfqId}`);
  await expect(page.getByRole("heading", { name: /400 × Woven/ })).toBeVisible();
  // Locked: protected buyer data must not be anywhere in the HTML.
  let html = await page.content();
  for (const secret of [f.buyer, "Secret Buyer Name", "Hidden Hat Co", "555 0177", "98101"]) expect(html).not.toContain(secret);

  // Attempt 1: declined card.
  await page.getByLabel(/buying opportunity, not a guaranteed order/).check();
  await page.getByRole("button", { name: "Pay by card" }).click();
  await page.waitForURL(/\/payments\/sandbox/);
  await page.getByRole("button", { name: "Simulate declined card" }).click();
  await page.waitForURL(new RegExp(`/seller/opportunities/${f.rfqId}`));
  await expect(page.getByText("Payment failed")).toBeVisible();
  html = await page.content();
  expect(html).not.toContain(f.buyer);

  // Attempt 2: success → server verifies signed webhook → unlocked.
  await page.getByLabel(/buying opportunity, not a guaranteed order/).check();
  await page.getByRole("button", { name: "Pay by card" }).click();
  await page.waitForURL(/\/payments\/sandbox/);
  await page.getByRole("button", { name: "Simulate successful payment" }).click();
  await page.waitForURL(new RegExp(`/seller/opportunities/${f.rfqId}`));
  await expect(page.getByText("Buyer details")).toBeVisible();
  await expect(page.getByText(f.buyer)).toBeVisible();
  await expect(page.getByText(/Receipt R-\d{4}-/)).toBeVisible();

  // Quote.
  await page.fill("#unitPrice", "1.10");
  await page.fill("#productionDays", "10");
  await page.fill("#shipping", "55");
  await expect(page.getByText("$495.00")).toBeVisible(); // 400 × 1.10 + 55
  await page.getByRole("button", { name: "Send quote to buyer" }).click();
  await expect(page.getByText("Quote sent to the buyer.")).toBeVisible();

  // Buyer sees and compares the quote.
  const ctx = await browser.newContext();
  const buyer = await ctx.newPage();
  await login(buyer, f.buyer, f.password);
  await buyer.goto(`/buyer/rfqs/${f.rfqId}`);
  await expect(buyer.getByText("Quotations (1)")).toBeVisible();
  await expect(buyer.getByText("$495.00").first()).toBeVisible();
  await ctx.close();
});
