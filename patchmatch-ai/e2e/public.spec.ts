import { expect, test } from "@playwright/test";

const PAGES = ["/", "/how-it-works", "/get-quotes", "/patch-types", "/patch-types/embroidered", "/custom-patches/hats", "/become-a-seller", "/seller-pricing", "/verification", "/manufacturers", "/rfq-quality-policy", "/data-sharing-policy", "/blog", "/help", "/buyer-protection", "/compare-quotes", "/faq"];

test("public pages render without client errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const p of PAGES) {
    const res = await page.goto(p);
    expect(res?.status(), p).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("homepage hero and CTAs @mobile", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your Patch.");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("link", { name: "Get free custom patch quotes" })).toBeVisible();
});

test("security headers are present", async ({ request }) => {
  const res = await request.get("/");
  expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
});
