// List menu, adding cards and drag and drop. (#13 #14 #17)
import { run, ok, guest, api, saved, shot, BASE } from "./e2e-lib.mjs";
await run("e2e-lists", async ({ newPage }) => {
  const p = await guest(newPage); const ws = (await api(p, "GET", "/api/me")).json.workspaces[0].id;
  const b = (await api(p, "POST", "/api/boards", { title: "Lists QA", workspaceId: ws, template: "kanban" })).json.board;
  const other = (await api(p, "POST", "/api/boards", { title: "Other board", workspaceId: ws })).json.board;
  await p.goto(`${BASE}/app/b/${b.id}`); await p.waitForSelector(".b-list");
  const titles = async () => p.locator(".b-list[data-list-id] .b-list__hd input").evaluateAll(els => els.map(e => e.value));
  const cardsIn = async name => p.locator(`.b-list[aria-label="${name}"] .b-card__t`).allInnerTexts();
  const menu = async name => { await p.getByRole("button", { name: `List actions for ${name}` }).click(); return p.getByTestId("list-menu"); };
  // the ⋯ button opens a menu instead of archiving
  let m = await menu("Backlog"); ok(await m.isVisible() && (await titles()).includes("Backlog"), "⋯ opens the list menu (list not archived)"); await shot(p, "13-list-menu");
  for (const item of ["Add card", "Copy list", "Move list", "Move all cards in this list", "Sort by…", "Watch", "Archive this list", "Archive all cards in this list"]) ok(await m.getByRole("button", { name: item, exact: true }).or(m.getByRole("menuitemcheckbox", { name: item })).count() > 0, `menu has "${item}"`);
  // add card at the top
  await m.getByRole("button", { name: "Add card" }).click(); await p.getByLabel("Enter a title for this card").fill("Top one"); await p.keyboard.press("Enter"); await p.getByLabel("Enter a title for this card").fill("Top two"); await p.keyboard.press("Enter"); await p.keyboard.press("Escape"); await saved(p);
  ok((await cardsIn("Backlog")).slice(0, 2).join("|") === "Top one|Top two", "menu Add card inserts at the top, in order");
  // add card at the bottom: Enter adds, Escape closes (#14)
  await p.locator('.b-list[aria-label="Done"] .b-add').click(); await p.getByLabel("Enter a title for this card").fill("Bottom card"); await p.keyboard.press("Enter"); ok(await p.getByLabel("Enter a title for this card").isVisible(), "composer stays open after Enter"); await p.keyboard.press("Escape"); await saved(p);
  ok((await cardsIn("Done")).at(-1) === "Bottom card" && !(await p.getByLabel("Enter a title for this card").count()), "Enter adds at the bottom, Escape closes");
  // copy list
  m = await menu("Backlog"); await m.getByRole("button", { name: "Copy list" }).click(); await m.getByLabel("Name").fill("Backlog copy"); await m.getByRole("button", { name: "Create list" }).click(); await saved(p);
  const t1 = await titles(); ok(t1[t1.indexOf("Backlog") + 1] === "Backlog copy" && (await cardsIn("Backlog copy")).length === (await cardsIn("Backlog")).length, "copied list appears after the original with its cards");
  // move list position
  m = await menu("Backlog copy"); await m.getByRole("button", { name: "Move list" }).click(); await m.getByLabel("Position").selectOption("0"); await m.getByRole("button", { name: "Move", exact: true }).click(); await saved(p);
  ok((await titles())[0] === "Backlog copy", "list moved to position 1");
  // move all cards
  const n = (await cardsIn("Backlog copy")).length; m = await menu("Backlog copy"); await m.getByRole("button", { name: "Move all cards in this list" }).click(); await m.getByRole("button", { name: "Review" }).click(); await saved(p);
  ok((await cardsIn("Backlog copy")).length === 0 && (await cardsIn("Review")).length === n, "all cards moved to Review");
  // sort
  m = await menu("Review"); await m.getByRole("button", { name: "Sort by…" }).click(); await m.getByRole("button", { name: "Card name (alphabetically)" }).click(); await saved(p);
  const r = await cardsIn("Review"); ok(r.join() === [...r].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })).join(), "list sorted by name: " + r.join(" | "));
  // watch
  m = await menu("Review"); await m.getByRole("menuitemcheckbox", { name: "Watch" }).click(); await saved(p); ok(await p.locator('.b-list[aria-label="Review"] .b-watch').isVisible(), "watched list shows the eye");
  // archive all cards, archive list
  m = await menu("Review"); await m.getByRole("button", { name: "Archive all cards in this list" }).click(); await m.getByRole("button", { name: "Archive all" }).click(); await saved(p);
  ok((await cardsIn("Review")).length === 0, "archive all cards empties the list");
  m = await menu("Backlog copy"); await m.getByRole("button", { name: "Archive this list" }).click(); await saved(p); ok(!(await titles()).includes("Backlog copy"), "archive list removes it from the board");
  // move list to another board
  m = await menu("Doing"); await m.getByRole("button", { name: "Move list" }).click(); await m.getByLabel("Board").selectOption(other.id); await p.waitForTimeout(400); await m.getByRole("button", { name: "Move", exact: true }).click(); await p.waitForSelector("text=Moved “Doing”");
  ok(!(await titles()).includes("Doing"), "list left this board"); const ob = (await api(p, "GET", `/api/b/${other.id}`)).json.board; ok(ob.lists.some(l => l.title === "Doing" && l.cards.length === 1), "list arrived on the other board with its card");
  // drag a card across lists (#17)
  const card = p.locator('.b-list[aria-label="Backlog"] [data-card-id]').first(); const cardTitle = await card.locator(".b-card__t").innerText();
  await card.dragTo(p.locator('.b-list[aria-label="Done"] .b-cards')); await saved(p);
  ok((await cardsIn("Done")).includes(cardTitle) && !(await cardsIn("Backlog")).includes(cardTitle), "card dragged from Backlog to Done");
  // drag a list by its header
  const before = await titles(); await p.locator('.b-list[aria-label="Done"] .b-list__hd').dragTo(p.locator('.b-list[aria-label="Backlog"] .b-list__hd'), { sourcePosition: { x: 200, y: 10 }, targetPosition: { x: 20, y: 10 } }); await saved(p);
  const after = await titles(); ok(after.indexOf("Done") < before.indexOf("Done"), `list dragged left (${after.join(", ")})`);
  await p.reload(); await p.waitForSelector(".b-list"); ok((await titles()).join() === after.join() && (await cardsIn("Done")).includes(cardTitle), "order survives a reload");
});
