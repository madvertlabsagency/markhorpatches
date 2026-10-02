import { expect, test } from "@playwright/test";
import { buildPatch } from "./helpers";

const WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
const PAGES = ["/", "/embroidered-patches", "/build-your-patch?type=PVC", "/pricing", "/free-mockup", "/gallery", "/patch-finder"];

test("no horizontal overflow at any supported width", async ({ page }) => {
  test.setTimeout(180_000);
  for (const path of PAGES) {
    await page.goto(path);
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(80);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} overflows at ${w}px by ${overflow}px`).toBeLessThanOrEqual(0);
      // body uses overflow-x: clip, so also assert that no interactive control is pushed off-screen.
      const offscreen = await page.evaluate((vw) => Array.from(document.querySelectorAll("header a, header button")).filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && getComputedStyle(el).display !== "none" && r.right > vw + 1; }).map((el) => el.getAttribute("aria-label") ?? el.textContent?.trim()), w);
      expect(offscreen, `${path} @${w}px: header controls off-screen: ${offscreen.join(", ")}`).toEqual([]);
    }
  }
});

test("mobile customer can build a patch and reach the cart @mobile", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  await buildPatch(page, { mobile: true });
  await expect(page.getByRole("heading", { name: "Your patches." })).toBeVisible();
});
