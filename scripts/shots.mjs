// Drives the real app (production build, demo account) to capture product shots AND smoke-test the core flow.
import fs from "node:fs";
import assert from "node:assert/strict";
import { withApp, demoPage, out } from "./shotlib.mjs";
const dir = out("trelloisdead"); const pub = new URL("../public/home/", import.meta.url).pathname; fs.mkdirSync(pub, { recursive: true });
const save = async (page, name, opts = {}) => { await page.screenshot({ path: `${dir}/${name}.png`, ...opts }); fs.copyFileSync(`${dir}/${name}.png`, `${pub}${name}.png`); };
const cardsIn = (page, list) => page.locator(`[data-list-id] >> nth=${list}`).locator("[data-card-id] .tr-card__t").allInnerTexts();
await withApp("trelloisdead", async ({ base, browser }) => {
  const { ctx, page } = await demoPage(browser, base, { w: 1440, h: 900 });
  await page.waitForSelector('[data-testid="boards"] a'); await page.waitForTimeout(300); await save(page, "home");
  await page.getByRole("link", { name: "Open Launch plan" }).click(); await page.waitForSelector('[data-testid="lists"] [data-card-id]'); await page.waitForTimeout(300); await save(page, "board");
  // add a card with Enter, twice (composer stays open)
  const todo = page.locator('section[aria-label="To do"]'); await todo.getByRole("button", { name: "+ Add a card" }).click();
  await page.getByLabel("Card title").fill("Email the beta list"); await page.keyboard.press("Enter"); await page.getByLabel("Card title").fill("Record a demo"); await page.keyboard.press("Enter"); await page.keyboard.press("Escape");
  assert.deepEqual((await cardsIn(page, 1)).slice(-2), ["Email the beta list", "Record a demo"]);
  // drag a card from To do to Done (real HTML5 drag and drop)
  const card = page.locator('[data-card-id]', { hasText: "Book the demo room" }); const done = page.locator('section[aria-label="Done"] .tr-cards');
  await card.dragTo(done); await page.waitForTimeout(300);
  assert.ok((await cardsIn(page, 3)).includes("Book the demo room"), "card moved to Done"); assert.ok(!(await cardsIn(page, 1)).includes("Book the demo room"), "card left To do");
  // reorder lists by dragging a list header
  await page.locator('section[aria-label="Done"] .tr-list__hd').dragTo(page.locator('section[aria-label="Ideas"]')); await page.waitForTimeout(300);
  assert.equal(await page.locator("[data-list-id]").first().getAttribute("aria-label"), "Done");
  await page.locator('section[aria-label="Done"] .tr-list__hd').dragTo(page.locator('section[aria-label="In progress"]')); await page.waitForTimeout(200);
  // card details
  await page.getByRole("button", { name: "Open card Write release notes" }).click(); await page.getByRole("dialog").waitFor();
  await page.getByLabel("New checklist item").fill("Send to legal"); await page.keyboard.press("Enter"); await page.getByLabel("Description").fill("Keep it under 300 words.\nLink the changelog."); await page.getByLabel("Description").blur();
  await page.getByRole("checkbox").first().check(); await page.getByRole("button", { name: "Label Orange", exact: true }).click(); await page.waitForTimeout(300); await save(page, "card");
  // move via the select (the mobile path), archive, restore
  await page.getByLabel("Move to list").selectOption({ label: "In progress" }); await page.waitForTimeout(200); await page.keyboard.press("Escape");
  assert.ok((await cardsIn(page, 2)).includes("Write release notes"));
  await page.getByRole("button", { name: "Open card Write release notes" }).click(); await page.getByRole("button", { name: "Archive", exact: true }).click(); assert.equal(await page.getByRole("button", { name: "Open card Write release notes" }).count(), 0);
  await page.getByRole("button", { name: /^Archive \(/ }).click(); await page.getByRole("button", { name: "Restore" }).first().click(); await page.getByRole("button", { name: "Close" }).click();
  assert.equal(await page.getByRole("button", { name: "Open card Write release notes" }).count(), 1);
  // filter by label
  await page.getByRole("button", { name: "Filter label Red" }).click(); await page.waitForTimeout(250); await save(page, "filter");
  assert.equal(await page.locator("[data-card-id]").count(), 1); await page.getByRole("button", { name: "Clear" }).click();
  // persistence across a full reload and a fresh browser context (server copy)
  await page.getByText("Saved").waitFor(); await page.reload(); await page.waitForSelector("[data-card-id]");
  assert.ok((await cardsIn(page, 3)).includes("Book the demo room"), "moves persisted"); assert.equal(await page.locator("section.tr-list").count() > 0, true);
  const { ctx: c2, page: p2 } = await demoPage(browser, base); await p2.getByRole("link", { name: "Open Launch plan" }).click(); await p2.waitForSelector("[data-card-id]");
  assert.ok((await p2.locator('section[aria-label="Done"] .tr-card__t').allInnerTexts()).includes("Book the demo room"), "same boards on another device"); await c2.close();
  // create a board
  await page.goto(base + "/app"); await page.getByRole("button", { name: "+ Create new board" }).click(); await page.getByLabel("Board title").fill("Q4 hiring"); await page.getByRole("button", { name: "Background Grape" }).click(); await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("link", { name: "Open Q4 hiring" }).click(); await page.waitForSelector("[data-list-id]"); assert.equal(await page.locator("[data-list-id]").count(), 3);
  // mobile
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const mp = await m.newPage();
  await mp.goto(base + "/login"); await mp.getByRole("button", { name: "Use the demo account" }).click(); await mp.waitForURL(/\/app/); await mp.getByRole("link", { name: "Open Launch plan" }).click(); await mp.waitForSelector("[data-card-id]"); await mp.screenshot({ path: `${dir}/mobile-board.png` });
  assert.ok(await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "no horizontal page scroll on the mobile board"); await m.close(); await ctx.close();
  const c3 = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p3 = await c3.newPage();
  await p3.goto(base); await p3.waitForTimeout(500); await p3.screenshot({ path: `${dir}/home-top.png` }); await p3.screenshot({ path: `${dir}/home-full.png`, fullPage: true });
  await p3.goto(base + "/#pricing"); await p3.waitForTimeout(300); await p3.screenshot({ path: `${dir}/home-pricing.png` });
  await p3.goto(base + "/login"); await p3.waitForTimeout(300); await p3.screenshot({ path: `${dir}/login.png` });
  const c4 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const p4 = await c4.newPage();
  await p4.goto(base); await p4.waitForTimeout(500); await p4.screenshot({ path: `${dir}/mobile-home.png` });
  assert.ok(await p4.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "no horizontal scroll on the mobile homepage");
  const c5 = await browser.newContext(); const p5 = await c5.newPage(); await p5.goto(base + "/app"); assert.match(p5.url(), /\/login/);
  console.log("trelloisdead smoke OK");
});
