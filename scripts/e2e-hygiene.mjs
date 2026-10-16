// Console errors on every page (#30) and the 390px layout (#31): no horizontal page scroll, dialogs fit the screen.
import { run, ok, guest, api, shot, BASE } from "./e2e-lib.mjs";
const MARKETING = ["/", "/pricing", "/features", "/solutions", "/help", "/about", "/privacy", "/terms", "/templates", "/login", "/signup", "/forgot-password"];
await run("e2e-hygiene", async ({ newPage }) => {
  for (const [w, h, tag] of [[1440, 900, "desktop"], [390, 844, "390px"]]) {
    const p = await guest(newPage, { w, h }); const me = (await api(p, "GET", "/api/me")).json; const ws = me.workspaces[0].id;
    const b = (await api(p, "POST", "/api/boards", { title: "Hygiene", workspaceId: ws, template: "sprint" })).json.board; const card = b.lists[0].cards[0].id;
    const app = ["/app", "/app/home", "/app/templates", `/app/w/${ws}`, `/app/w/${ws}/members`, `/app/w/${ws}/settings`, `/app/b/${b.id}`, `/app/b/${b.id}?card=${card}`, ...["table", "calendar", "timeline", "dashboard", "map"].map(v => `/app/b/${b.id}?view=${v}`), "/app/search?q=bug", "/app/u/profile", "/app/u/activity", "/app/u/cards", "/app/u/settings", "/this-is-a-404"];
    const bad = [];
    for (const path of [...MARKETING, ...app]) { await p.goto(BASE + path); await p.waitForLoadState("networkidle"); await p.waitForTimeout(250); const sw = await p.evaluate(() => document.documentElement.scrollWidth); if (sw > w + 1) bad.push(`${path} (${sw}px)`); }
    ok(!bad.length, `${tag}: no horizontal page scroll on ${MARKETING.length + app.length} pages${bad.length ? ": " + bad.join(", ") : ""}`);
    if (w === 390) {
      const fits = async (loc, name) => { const r = await loc.boundingBox(); ok(!!r && r.x >= -1 && r.x + r.width <= w + 1, `390px: ${name} fits the screen`); };
      await p.goto(`${BASE}/app/b/${b.id}`); await p.waitForSelector(".b-list"); await shot(p, "31-m-board");
      await p.getByTestId("filter-btn").click(); await fits(p.getByTestId("filter-panel"), "filter panel"); await p.keyboard.press("Escape");
      await p.getByRole("button", { name: "Show menu" }).click(); await fits(p.getByTestId("board-menu"), "board menu"); await p.getByRole("button", { name: "Close menu" }).click();
      await p.getByRole("button", { name: /List actions for/ }).first().click(); await fits(p.getByTestId("list-menu"), "list menu"); await p.keyboard.press("Escape");
      await p.locator("[data-card-id]").first().click(); const m = p.getByTestId("card-modal"); await m.waitFor(); await fits(m, "card back"); await shot(p, "31-m-card");
      await m.getByRole("button", { name: "Dates", exact: true }).click(); await fits(p.getByTestId("dates-pop"), "dates popover"); await p.keyboard.press("Escape"); await p.keyboard.press("Escape");
      await p.getByRole("button", { name: /^Notifications/ }).click(); await fits(p.getByRole("dialog", { name: "Notifications" }), "notifications"); await p.keyboard.press("Escape");
      await p.getByRole("button", { name: /^Account:/ }).click(); await fits(p.getByRole("menu", { name: "Account" }), "account menu"); await p.keyboard.press("Escape");
      await p.getByRole("button", { name: "More" }).click(); await fits(p.locator(".tr-pop").first(), "header More menu"); await p.keyboard.press("Escape");
      await p.goto(BASE + "/app"); await p.waitForSelector("[data-testid=boards]"); await shot(p, "31-m-boards");
    }
  }
});
