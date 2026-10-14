import { expect, test } from "@playwright/test";
import { ARTWORK, buildPatch, checkout } from "./helpers";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "";

test("admin uploads a proof and the customer approves it", async ({ page, browser }) => {
  test.skip(!ADMIN_PASSWORD, "SEED_ADMIN_PASSWORD not set");

  // Customer purchases
  await buildPatch(page);
  await checkout(page, `proof-${Date.now()}@example.com`);
  const orderUrl = page.url();
  const orderNumber = (await page.getByText(/^Order PG-\d{6}$/).textContent())!.replace("Order ", "");

  // Admin uploads + sends proof
  const admin = await browser.newPage();
  await admin.goto("/login?next=/admin/orders");
  await admin.getByLabel("Email").fill(ADMIN_EMAIL);
  await admin.getByLabel("Password").fill(ADMIN_PASSWORD);
  await admin.getByRole("button", { name: /Sign in/ }).click();
  await admin.waitForURL("**/admin/orders");
  await admin.getByRole("link", { name: orderNumber }).click();
  await admin.setInputFiles('input[type="file"][accept=".png,.jpg,.jpeg,.pdf"]', ARTWORK);
  const create = admin.getByRole("button", { name: "Create proof version" });
  await expect(create).toBeEnabled({ timeout: 20_000 });
  await create.click();
  await expect(admin.getByText(/Proof V1 sent to customer/)).toBeVisible();
  await admin.close();

  // Customer approves
  await page.goto(orderUrl.replace("&paid=1", ""));
  await expect(page.getByText("Your proof is ready.").first()).toBeVisible();
  await page.getByRole("button", { name: "Approve for production" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/I confirm the artwork, dimensions, colors, spelling/)).toBeVisible();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Approve proof" }).click();
  await expect(page.getByText(/Approved\. Let.s make it real\./)).toBeVisible();
  await expect(page.getByText("Proof approved", { exact: true })).toBeVisible();
});

test("customer can request a revision on the free-mockup path", async ({ page, browser }) => {
  test.skip(!ADMIN_PASSWORD, "SEED_ADMIN_PASSWORD not set");
  await page.goto("/free-mockup");
  await page.getByLabel("Name").fill("Riley Revision");
  await page.getByLabel("Email").fill(`rev-${Date.now()}@example.com`);
  await page.getByRole("button", { name: /Create my free mockup/ }).click();
  await expect(page.getByRole("heading", { name: /in good hands/ })).toBeVisible();
  await page.getByRole("link", { name: /Track your request/ }).click();
  await page.waitForURL("**/order/**");
  const orderUrl = page.url();
  const orderNumber = (await page.getByText(/^Order PG-\d{6}$/).textContent())!.replace("Order ", "");

  const admin = await browser.newPage();
  await admin.goto("/login?next=/admin/proofs");
  await admin.getByLabel("Email").fill(ADMIN_EMAIL);
  await admin.getByLabel("Password").fill(ADMIN_PASSWORD);
  await admin.getByRole("button", { name: /Sign in/ }).click();
  await admin.waitForURL("**/admin/proofs");
  await admin.getByRole("link", { name: orderNumber }).first().click();
  await admin.setInputFiles('input[type="file"][accept=".png,.jpg,.jpeg,.pdf"]', ARTWORK);
  await expect(admin.getByRole("button", { name: "Create proof version" })).toBeEnabled({ timeout: 20_000 });
  await admin.getByRole("button", { name: "Create proof version" }).click();
  await expect(admin.getByText(/Proof V1 sent/)).toBeVisible();
  await admin.close();

  await page.goto(orderUrl);
  await page.getByRole("button", { name: /Request a revision/ }).click();
  await page.getByLabel("What should we change?").fill("Please make the border navy.");
  await page.getByRole("button", { name: "Send revision request" }).click();
  await expect(page.getByText(/We.re making the changes/)).toBeVisible();
});
