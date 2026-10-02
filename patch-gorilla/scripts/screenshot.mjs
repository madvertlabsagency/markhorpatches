// Dev helper: node scripts/screenshot.mjs <url> <out.png> [width] [height] [fullPage 1|0]
import { chromium } from "@playwright/test";
const [,, url, out, w = "1440", h = "900", full = "1"] = process.argv;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
p.on("console", (m) => { if (m.type() === "error") console.log("console error:", m.text().slice(0, 300)); });
p.on("pageerror", (e) => console.log("page error:", e.message.slice(0, 300)));
await p.goto(url, { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
if (full === "1") { await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 300)); } window.scrollTo(0, 0); }); await p.waitForTimeout(1500); }
await p.screenshot({ path: out, fullPage: full === "1" });
await b.close();
