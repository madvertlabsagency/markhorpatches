import { expect, test } from "@playwright/test";
import { fx, login } from "./helpers";

test("non-matched seller cannot see the opportunity", async ({ page }) => {
  const f = fx();
  await login(page, f.outsider, f.password);
  const res = await page.goto(`/seller/opportunities/${f.rfqId}`);
  expect(res?.status()).toBe(404);
});

test("another buyer cannot see someone else's RFQ", async ({ page }) => {
  const f = fx();
  await login(page, f.otherBuyer, f.password);
  const res = await page.goto(`/buyer/rfqs/${f.rfqId}`);
  expect(res?.status()).toBe(404);
});

test("anonymous users are sent to login; sellers cannot open admin", async ({ page }) => {
  const f = fx();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
  await login(page, f.sellerA, f.password);
  const res = await page.goto("/admin");
  expect(res?.status()).toBe(403);
});

test("guest tracking requires the secret token", async ({ page }) => {
  const f = fx();
  await page.goto(`/rfq/track/${f.rfqRef}`);
  await expect(page.getByText("This request is private")).toBeVisible();
});

test("file and webhook endpoints reject unauthorised access", async ({ request }) => {
  expect((await request.get("/api/files/00000000-0000-0000-0000-000000000000")).status()).toBe(404);
  const forged = await request.post("/api/webhooks/payments/sandbox", { data: { eventId: "x", providerRef: "sbx_x", status: "PAID", amountMinor: 1, currency: "USD" } });
  expect(forged.status()).toBe(400);
  expect((await request.get("/api/cron/jobs")).status()).toBe(401);
});
