// QA screenshots for docs/qa/<date>/<TAG>-NN-topic.png against a running server.
// BASE=http://localhost:3019/trelloisdead TAG=before|after node scripts/qa-shots.mjs
import fs from "node:fs";
import { chromium } from "@playwright/test";
const BASE = process.env.BASE || "http://localhost:3019/trelloisdead", TAG = process.env.TAG || "after", DATE = process.env.DATE || "2026-10-16";
const dir = `docs/qa/${DATE}`; fs.mkdirSync(dir, { recursive: true });
const shot = (page, name, opts = {}) => page.screenshot({ path: `${dir}/${TAG}-${name}.png`, ...opts });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage();
const errors = []; page.on("pageerror", e => errors.push(String(e))); page.on("console", m => { if (m.type() === "error" && !/404 \(Not Found\)/.test(m.text())) errors.push(m.text()); });
const settle = (ms = 500) => page.waitForTimeout(ms);
await page.goto(BASE + "/"); await settle(); await shot(page, "01-landing");
await page.goto(BASE + "/pricing"); await settle(); await shot(page, "02-pricing");
await page.goto(BASE + "/login"); await settle(); await shot(page, "03-login");
await page.goto(BASE + "/signup"); await settle(); await shot(page, "04-signup");
await page.goto(BASE + "/nope-404"); await settle(); await shot(page, "05-404");
await page.goto(BASE + "/app"); await page.waitForURL(/\/app/); await settle(900); await shot(page, "06-boards");
const first = page.locator("a[href*='/app/b/']").first();
if (await first.count()) {
  await first.click(); await page.waitForURL(/\/app\/b\//); await settle(900); await shot(page, "07-board");
  const card = page.locator("[data-card-id]").first(); if (await card.count()) { await card.click(); await settle(600); await shot(page, "08-card"); await page.keyboard.press("Escape"); }
}
for (const extra of (process.env.EXTRA || "").split(",").filter(Boolean)) { await page.goto(BASE + extra); await settle(900); await shot(page, "x-" + extra.replace(/\W+/g, "-").replace(/^-|-$/g, "")); }
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const mp = await m.newPage();
for (const [n, p] of [["landing", "/"], ["pricing", "/pricing"], ["login", "/login"], ["boards", "/app"]]) {
  await mp.goto(BASE + p); await mp.waitForTimeout(900); await mp.screenshot({ path: `${dir}/${TAG}-m-${n}.png` });
  const ok = await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth); console.log(`390px ${n}: ${ok ? "no horizontal scroll" : "HORIZONTAL SCROLL"}`);
}
const b = mp.locator("a[href*='/app/b/']").first(); if (await b.count()) { await b.click(); await mp.waitForTimeout(900); await mp.screenshot({ path: `${dir}/${TAG}-m-board.png` }); const c = mp.locator("[data-card-id]").first(); if (await c.count()) { await c.click(); await mp.waitForTimeout(600); await mp.screenshot({ path: `${dir}/${TAG}-m-card.png` }); const ok = await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth); console.log(`390px card: ${ok ? "no horizontal scroll" : "HORIZONTAL SCROLL"}`); } }
console.log("console/page errors:", errors.length ? errors : "none");
await browser.close();
