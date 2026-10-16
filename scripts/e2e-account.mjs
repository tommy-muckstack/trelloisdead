// Account menu, profile, settings, theme, keyboard shortcuts, signed-out /app, persistence and sign out/in. (#8 #26 #27 #28 #29)
import { run, ok, guest, demo, api, saved, shot, BASE } from "./e2e-lib.mjs";
await run("e2e-account", async ({ newPage, browser }) => {
  // #8: a signed-out visitor to /app lands in their own guest workspace (IsDead rule), with sign-up offered
  const p = await guest(newPage); ok(await p.getByRole("link", { name: "Sign up to keep your work" }).isVisible(), "signed-out /app opens a guest workspace with a sign-up prompt");
  // account menu
  await p.getByRole("button", { name: /^Account:/ }).click(); const menu = p.getByRole("menu", { name: "Account" }); await shot(p, "26-account-menu");
  for (const l of ["Profile and visibility", "Activity", "Cards", "Settings"]) ok(await menu.getByRole("link", { name: l }).isVisible(), `menu: ${l}`);
  await menu.getByRole("button", { name: /Theme/ }).click(); await menu.getByRole("menuitemradio", { name: "Dark" }).click(); await p.waitForFunction(() => document.querySelector(".tr-app")?.getAttribute("data-theme") === "dark");
  ok(true, "theme switches to dark"); await p.keyboard.press("Escape"); await p.reload(); await p.waitForSelector("[data-testid=boards]"); ok(await p.locator(".tr-app").getAttribute("data-theme") === "dark", "dark theme persists across reload"); await shot(p, "26-dark-boards");
  // profile
  await p.goto(BASE + "/app/u/profile"); await p.getByLabel("Full name").fill("Grace Hopper"); await p.getByLabel("Username").fill("grace"); await p.getByRole("button", { name: "Save" }).click(); await p.waitForSelector("text=Profile saved.");
  ok(await p.getByRole("heading", { name: "Grace Hopper" }).isVisible() && await p.getByRole("button", { name: "Account: Grace Hopper" }).isVisible(), "profile name updates everywhere");
  await p.getByRole("radio", { name: "Avatar colour #6E5DC6" }).click(); await p.waitForTimeout(500); ok((await p.locator(".tr-avbtn .tr-av").getAttribute("style")).includes("110, 93, 198"), "avatar colour changes");
  // settings: colour blind + shortcuts toggle + light theme
  await p.goto(BASE + "/app/u/settings"); await p.getByLabel(/color blind friendly/).check(); await p.waitForTimeout(400); ok(await p.locator(".tr-app.cb").count() === 1, "colour blind mode adds label patterns");
  await p.getByRole("radio", { name: "Light" }).click(); await p.waitForFunction(() => document.querySelector(".tr-app")?.getAttribute("data-theme") === "light");
  await p.getByLabel(/Enable keyboard shortcuts/).uncheck(); await p.waitForTimeout(400); await p.keyboard.press("?"); ok(!(await p.getByTestId("shortcuts").count()), "shortcuts can be turned off");
  await p.getByLabel(/Enable keyboard shortcuts/).check(); await p.waitForTimeout(400); await p.locator("body").click({ position: { x: 5, y: 300 } }); await p.keyboard.press("?"); ok(await p.getByTestId("shortcuts").isVisible(), "? opens the shortcuts panel"); await shot(p, "27-shortcuts");
  await p.keyboard.press("Escape"); ok(!(await p.getByTestId("shortcuts").count()), "Esc closes it");
  await p.keyboard.press("/"); ok(await p.evaluate(() => document.activeElement?.getAttribute("aria-label") === "Search"), "/ focuses search"); await p.keyboard.press("Escape");
  // board shortcuts
  const ws = (await api(p, "GET", "/api/me")).json.workspaces[0].id; const b = (await api(p, "POST", "/api/boards", { title: "Keys QA", workspaceId: ws, template: "kanban" })).json.board;
  await p.goto(`${BASE}/app/b/${b.id}`); await p.waitForSelector(".b-list"); const me = (await api(p, "GET", "/api/me")).json.user.id;
  const card = id => api(p, "GET", `/api/b/${b.id}`).then(r => r.json.board.lists.flatMap(l => l.cards.map(c => ({ ...c, list: l.title }))).find(c => c.id === id));
  const c1 = b.lists[1].cards[0].id, c2 = b.lists[1].cards[1].id; const hov = id => p.locator(`[data-card-id="${id}"] .b-card__t`).hover();
  await hov(c1); await p.keyboard.press(" "); await saved(p); ok((await card(c1)).members.includes(me), "Space joins the hovered card");
  await p.keyboard.press("2"); await saved(p); ok((await card(c1)).labels.includes(b.labels[1].id), "number key toggles a label");
  await hov(c2); await p.keyboard.press("r"); await saved(p); ok((await card(c2)).labels.includes(b.labels[1].id), "R repeats the last label action on another card");
  await p.keyboard.press("."); await saved(p); ok((await card(c2)).list === "Doing", ". moves the card to the next list");
  await p.keyboard.press("z"); await saved(p); ok((await card(c2)).list === "To do", "Z undoes the move");
  await p.keyboard.press("Shift+Z"); await saved(p); ok((await card(c2)).list === "Doing", "Shift+Z redoes it");
  await hov(c2); await p.keyboard.press(","); await saved(p); ok((await card(c2)).list === "To do", ", moves it back");
  const w0 = (await card(c1)).watchers.includes(me); await hov(c1); await p.keyboard.press("s"); await saved(p); ok((await card(c1)).watchers.includes(me) === !w0, "S toggles watching the card");
  await hov(c1); await p.keyboard.press("n"); await p.getByLabel("Enter a title for this card").fill("Inserted after"); await p.keyboard.press("Enter"); await p.keyboard.press("Escape"); await saved(p);
  const todo = (await api(p, "GET", `/api/b/${b.id}`)).json.board.lists[1].cards.map(c => c.title); ok(todo[todo.indexOf((await card(c1)).title) + 1] === "Inserted after", "N adds a card below the hovered card");
  await hov(c1); await p.keyboard.press("c"); await saved(p); ok((await card(c1)).archived, "C archives the hovered card"); await p.getByRole("button", { name: "Undo" }).click(); await saved(p); ok(!(await card(c1)).archived, "toast Undo restores it");
  await p.mouse.move(5, 500); await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowRight"); ok(await p.locator(".b-card.sel").count() === 1, "arrow keys select a card"); await p.keyboard.press("Enter"); await p.getByTestId("card-modal").waitFor(); ok(true, "Enter opens the selected card"); await p.keyboard.press("Escape"); await p.getByTestId("card-modal").waitFor({ state: "detached" });
  await p.keyboard.press("f"); ok(await p.getByTestId("filter-panel").isVisible(), "F opens the filter"); await p.keyboard.press("Escape");
  await p.locator("body").click({ position: { x: 900, y: 700 } }); await p.keyboard.press("q"); ok((await p.getByTestId("filter-btn").textContent()).includes("1"), "Q filters to my cards"); await p.keyboard.press("x"); ok(!(await p.getByTestId("filter-btn").textContent()).includes("1"), "X clears filters");
  await p.keyboard.press("w"); ok(await p.getByTestId("board-menu").isVisible(), "W opens the board menu"); await p.keyboard.press("w"); ok(!(await p.getByTestId("board-menu").count()), "W closes it");
  await hov(c1); await p.keyboard.press("t"); await p.getByTestId("card-modal").waitFor(); await p.waitForTimeout(250); ok(await p.evaluate(() => document.activeElement?.getAttribute("aria-label") === "Card title"), "T opens the card with the title focused"); await p.keyboard.press("Escape"); await p.keyboard.press("Escape");
  // activity + cards pages
  await p.goto(BASE + "/app/u/activity"); await p.getByTestId("my-activity").waitFor(); ok(await p.getByTestId("my-activity").locator("li").count() > 3, "Activity page lists my actions");
  await p.goto(BASE + "/app/u/cards"); await p.getByTestId("my-cards").waitFor(); ok(await p.getByTestId("my-cards").getByRole("link", { name: (await card(c1)).title }).isVisible(), "Cards page lists cards I'm on");
  // #28/#29 persistence and sign out / in (demo account, no Firebase needed)
  const d = await demo(newPage, "demo"); const dws = (await api(d, "GET", "/api/me")).json.workspaces[0].id; const title = "Persist " + Date.now().toString(36);
  const db = (await api(d, "POST", "/api/boards", { title, workspaceId: dws })).json.board; await d.goto(`${BASE}/app/b/${db.id}`); await d.locator(".b-add").first().click(); await d.getByLabel("Enter a title for this card").fill("Still here after sign out"); await d.keyboard.press("Enter"); await saved(d);
  await d.getByRole("button", { name: /^Account:/ }).click(); await d.getByRole("menu", { name: "Account" }).getByRole("button", { name: "Log out" }).click(); await d.waitForURL(u => !u.pathname.includes("/app"));
  ok(true, "Log out returns to the logged-out site");
  await d.goto(BASE + "/login"); await d.getByRole("button", { name: "Use the demo account" }).click(); await d.waitForURL(/\/app/); await d.goto(`${BASE}/app/b/${db.id}`); await d.waitForSelector(".b-list");
  ok(await d.getByText("Still here after sign out").isVisible(), "work is still there after signing back in");
  void browser;
});
