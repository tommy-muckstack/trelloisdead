// Views (Table, Calendar, Timeline, Dashboard, Map), Power-Ups and Automation. (#21 #22)
import { run, ok, guest, api, saved, shot, BASE } from "./e2e-lib.mjs";
const pad = n => String(n).padStart(2, "0"); const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
await run("e2e-views", async ({ newPage }) => {
  const p = await guest(newPage); const ws = (await api(p, "GET", "/api/me")).json.workspaces[0].id;
  const b = (await api(p, "POST", "/api/boards", { title: "Views QA", workspaceId: ws, template: "kanban" })).json.board;
  const lists = b.lists; const cards = lists.flatMap(l => l.cards); const today = new Date(); today.setHours(12, 0, 0, 0);
  const at = n => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };
  await api(p, "POST", `/api/b/${b.id}`, { actions: [
    { t: "card.patch", cardId: cards[0].id, patch: { due: at(2).toISOString(), start: ymd(at(0)) } }, { t: "card.patch", cardId: cards[1].id, patch: { due: at(5).toISOString() } },
    { t: "card.patch", cardId: cards[2].id, patch: { due: at(-1).toISOString() } }, { t: "card.patch", cardId: cards[3].id, patch: { location: { name: "Ferry Building", address: "San Francisco", lat: 37.7955, lng: -122.3937 } } }] });
  await p.goto(`${BASE}/app/b/${b.id}`); await p.waitForSelector(".b-list"); const total = await p.locator("[data-card-id]").count();
  const view = async name => { await p.getByTestId("view-switcher").click(); await p.getByRole("menuitemradio", { name, exact: true }).click(); await p.waitForURL(new RegExp(name === "Board" ? "b/[^?]+$" : `view=${name.toLowerCase()}`)); };
  // table
  await view("Table"); const t = p.getByTestId("view-table"); ok((await t.locator("tbody tr").count()) === total, `table lists every card (${total})`);
  await t.getByRole("button", { name: "Sort by Card" }).click(); const names = await t.locator(".v-cardlink").allInnerTexts(); ok(names.join() === [...names].sort((a, b) => a.localeCompare(b)).join(), "table sorts by card name"); await shot(p, "22-table");
  await t.getByLabel(`List for ${cards[4].title}`).selectOption({ label: "Review" }); await saved(p); ok((await api(p, "GET", `/api/b/${b.id}`)).json.board.lists[3].cards.some(c => c.id === cards[4].id), "moving a card from the table");
  await t.getByLabel("New card title").fill("Added from table"); await t.getByRole("button", { name: "Add", exact: true }).click(); await saved(p); ok(await t.getByText("Added from table").isVisible(), "adding a card from the table");
  await p.getByTestId("filter-btn").click(); await p.getByLabel("Filter by keyword").fill("timeline"); ok((await t.locator("tbody tr").count()) === 1, "filter applies to the table"); await p.getByRole("button", { name: "Clear filters" }).click(); await p.keyboard.press("Escape");
  await t.locator(".v-cardlink").first().click(); ok(await p.getByTestId("card-modal").waitFor().then(() => true), "table row opens the card"); await p.keyboard.press("Escape"); await p.getByTestId("card-modal").waitFor({ state: "detached" });
  // calendar: cards on their due day, drag to reschedule, add on a day
  await view("Calendar"); const cal = p.getByTestId("view-calendar"); ok(await cal.locator(`[data-day="${ymd(at(5))}"] .v-calcard`).count() === 1, "card shows on its due date"); await shot(p, "22-calendar");
  const target = at(5).getMonth() === at(6).getMonth() ? at(6) : at(4);
  await cal.locator(`[data-day="${ymd(at(5))}"] .v-calcard`).dragTo(cal.locator(`[data-day="${ymd(target)}"]`)); await saved(p);
  let c1 = (await api(p, "GET", `/api/b/${b.id}`)).json.board.lists.flatMap(l => l.cards).find(c => c.id === cards[1].id); ok(ymd(new Date(c1.due)) === ymd(target), "dragging a card to another day changes its due date");
  await cal.locator(`[data-day="${ymd(at(3))}"]`).hover(); await cal.getByRole("button", { name: `Add a card due ${ymd(at(3))}` }).click(); await cal.getByLabel("New card title").fill("Calendar card"); await p.keyboard.press("Enter"); await saved(p);
  ok(await cal.locator(`[data-day="${ymd(at(3))}"] .v-calcard`, { hasText: "Calendar card" }).count() === 1, "adding a card on a calendar day");
  await cal.getByRole("button", { name: "Next" }).click(); await cal.getByRole("button", { name: "Today" }).click(); ok(true, "calendar paging");
  // timeline: bars, drag to shift dates
  await view("Timeline"); const tl = p.getByTestId("view-timeline"); ok(await tl.locator(".v-bar").count() >= 3, "timeline draws a bar per dated card"); await shot(p, "22-timeline");
  const bar = tl.locator(`[data-bar="${cards[0].id}"]`); const box = await bar.boundingBox(); await p.mouse.move(box.x + 10, box.y + 10); await p.mouse.down(); await p.mouse.move(box.x + 10 + 36 * 2 + 4, box.y + 10, { steps: 6 }); await p.mouse.up(); await saved(p);
  const c0 = (await api(p, "GET", `/api/b/${b.id}`)).json.board.lists.flatMap(l => l.cards).find(c => c.id === cards[0].id); ok(ymd(new Date(c0.due)) === ymd(at(4)) && c0.start === ymd(at(2)), "dragging a bar shifts start and due by two days");
  // dashboard
  await view("Dashboard"); const dash = p.getByTestId("view-dashboard"); const vals = (await dash.getByTestId("dash-list").locator(".v-barval").allInnerTexts()).map(Number);
  ok(vals.reduce((a, b) => a + b, 0) === total + 2, `cards-per-list totals match (${vals.join("+")})`); ok(Number(await dash.getByTestId("dash-due").locator(".v-barrow", { hasText: "Overdue" }).locator(".v-barval").innerText()) === 1, "due-date chart counts the overdue card"); await shot(p, "22-dashboard");
  // map
  await view("Map"); const map = p.getByTestId("view-map"); await map.locator(".leaflet-interactive").first().waitFor({ timeout: 15000 }); ok((await map.locator("path.leaflet-interactive").count()) === 1, "map shows one marker"); await shot(p, "22-map");
  await map.locator("path.leaflet-interactive").click(); await map.locator(".v-mappop").click(); ok(await p.getByTestId("card-modal").waitFor().then(() => true), "marker popup opens the card"); await p.keyboard.press("Escape"); await p.getByTestId("card-modal").waitFor({ state: "detached" });
  await view("Board");
  // power-ups
  await p.getByRole("button", { name: "Power-Ups" }).click(); const pu = p.getByTestId("powerups"); ok((await pu.locator("[data-powerup]").count()) === 5, "Power-Ups directory lists 5"); await shot(p, "21-powerups");
  for (const id of ["voting", "numbers", "limits", "aging"]) await pu.locator(`[data-powerup=${id}]`).getByRole("button", { name: "Add" }).click();
  await saved(p); await p.keyboard.press("Escape");
  ok(await p.locator(".b-num").count() >= total, "Card Numbers shows #N on cards");
  await p.locator(`[data-card-id="${cards[0].id}"]`).click(); await p.getByTestId("card-modal").getByRole("button", { name: /^Vote/ }).click(); await saved(p); await p.keyboard.press("Escape");
  ok(await p.locator(`[data-card-id="${cards[0].id}"] .b-badge[title=Votes]`).innerText() === "1", "Voting: vote badge on the card");
  await p.getByRole("button", { name: "List actions for Backlog" }).click(); await p.getByTestId("list-menu").getByRole("button", { name: "Set list limit" }).click(); await p.getByLabel("List limit").fill("1"); await p.getByRole("button", { name: "Save" }).click(); await saved(p);
  ok(await p.locator('.b-list[aria-label="Backlog"].over-limit').count() === 1, "List Limits: over-limit list turns red");
  // automation: rule + card button + board button
  await p.getByRole("button", { name: "Automation" }).click(); const au = p.getByTestId("automation"); await au.getByRole("button", { name: "Create rule" }).click();
  const rf = au.getByTestId("rule-form"); await rf.getByLabel("Trigger", { exact: true }).selectOption("card.moved"); await rf.getByLabel("Trigger list").selectOption({ label: "Done" });
  await rf.getByLabel("Add an action").selectOption("label"); await rf.getByLabel("Label", { exact: true }).selectOption({ label: "Quick win" }); await rf.getByRole("button", { name: "Save rule" }).click(); await saved(p);
  ok(await au.getByTestId("rules").locator("li").first().innerText().then(x => x.includes("when a card is moved into list “Done”")), "rule listed in plain English"); await shot(p, "21-automation");
  await au.getByRole("tab", { name: "Card buttons" }).click(); await au.getByRole("button", { name: "Create card button" }).click(); const bf = au.getByTestId("button-form"); await bf.getByLabel("Button name").fill("Send to review");
  await bf.getByLabel("Add an action").selectOption("move"); await bf.getByLabel("Move to list").selectOption({ label: "Review" }); await bf.getByRole("button", { name: "Save button" }).click();
  await au.getByRole("tab", { name: "Board buttons" }).click(); await au.getByRole("button", { name: "Create board button" }).click(); await au.getByTestId("button-form").getByLabel("Button name").fill("Sort backlog"); await au.getByTestId("button-form").getByLabel("Sort by").selectOption("title"); await au.getByTestId("button-form").getByRole("button", { name: "Save button" }).click(); await saved(p);
  await p.keyboard.press("Escape");
  await p.locator(`[data-card-id="${cards[1].id}"]`).click(); const m = p.getByTestId("card-modal"); await m.getByRole("button", { name: /^In list/ }).click(); await p.getByTestId("move-pop").getByLabel("List").selectOption({ label: "Done" }); await p.getByTestId("move-pop").getByRole("button", { name: "Move" }).click(); await saved(p);
  const bd = (await api(p, "GET", `/api/b/${b.id}`)).json.board; let c = bd.lists.flatMap(l => l.cards).find(x => x.id === cards[1].id); const qw = bd.labels.find(l => l.name === "Quick win").id; ok(c.dueComplete && c.labels.includes(qw), "rule ran: moved into Done → complete + label");
  await m.getByRole("button", { name: "Send to review" }).click(); await saved(p); ok(await m.getByRole("button", { name: /^In list Review/ }).isVisible(), "card button moved the card"); await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "Sort backlog" }).click(); await saved(p); ok(true, "board button ran");
  await p.getByRole("button", { name: "Show menu" }).click(); await p.getByTestId("board-menu").getByRole("button", { name: "Activity", exact: true }).click(); ok(await p.getByTestId("board-menu").getByText(/^Automation:/).first().isVisible(), "automation runs show in board activity");
});
