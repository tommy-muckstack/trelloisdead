// Board header, filter panel, board menu (about, activity, archive, settings, labels, copy, export, close) and sharing. (#12 #18 #20)
import { run, ok, guest, demo, api, saved, shot, BASE } from "./e2e-lib.mjs";
const firstBoard = async p => { await p.locator(".tr-tile a").first().click(); await p.waitForURL(/\/app\/b\//); await p.waitForSelector("[data-testid=board-header]"); return p.url().split("/b/")[1].split("?")[0]; };
await run("e2e-board-header", async ({ newPage }) => {
  const p = await guest(newPage);
  const ws = (await api(p, "GET", "/api/me")).json.workspaces[0].id;
  const b = (await api(p, "POST", "/api/boards", { title: "Header QA", workspaceId: ws, template: "sprint" })).json.board;
  await p.goto(`${BASE}/app/b/${b.id}`); await p.waitForSelector("[data-testid=board-header]");
  // star + visibility
  await p.getByRole("button", { name: "Star board" }).click(); ok(await p.getByRole("button", { name: "Unstar board" }).isVisible(), "star toggles");
  await p.getByRole("button", { name: /^Visibility:/ }).click(); await p.getByRole("menuitemradio", { name: /Private/ }).click(); await saved(p);
  ok(await p.getByRole("button", { name: "Visibility: Private" }).isVisible(), "visibility changed to Private");
  // filter
  const all = await p.locator("[data-card-id]").count();
  await p.getByTestId("filter-btn").click(); ok(await p.getByTestId("filter-panel").isVisible(), "filter panel opens"); await shot(p, "18-filter");
  await p.getByTestId("filter-label-red").locator("input").check(); const bugs = await p.locator("[data-card-id]").count(); ok(bugs > 0 && bugs < all, `label filter narrows cards (${bugs}/${all})`);
  ok((await p.getByTestId("filter-btn").textContent()).includes("1"), "filter button shows the count");
  await p.getByTestId("filter-label-red").locator("input").uncheck(); await p.getByTestId("filter-me").locator("input").check(); ok((await p.locator("[data-card-id]").count()) === 0, "assigned-to-me filter hides unassigned cards");
  await p.getByTestId("filter-me").locator("input").uncheck(); await p.getByLabel("Filter by keyword").fill('"date picker"'); ok((await p.locator("[data-card-id]").count()) === 1, "quoted keyword matches the exact phrase");
  await p.getByLabel("Filter by keyword").fill(""); await p.getByLabel("Overdue").check().catch(async () => p.locator(".f-row", { hasText: "Overdue" }).locator("input").check());
  await p.locator(".f-row", { hasText: "No dates" }).locator("input").check(); const anyN = await p.locator("[data-card-id]").count(); await p.getByLabel("Match").selectOption("exact"); const exactN = await p.locator("[data-card-id]").count();
  ok(anyN > 0 && exactN === 0, `Any vs Exact match (${anyN} vs ${exactN})`);
  await p.getByRole("button", { name: "Clear filters" }).click(); await p.keyboard.press("Escape"); ok((await p.locator("[data-card-id]").count()) === all, "clearing restores all cards");
  // menu: about
  await p.getByRole("button", { name: "Show menu" }).click(); ok(await p.getByTestId("board-menu").isVisible(), "board menu opens"); await shot(p, "12-board-menu");
  await p.getByTestId("board-menu").getByRole("button", { name: /About this board/ }).click(); await p.getByRole("button", { name: "Edit" }).click(); await p.getByLabel("Board description").fill("Sprint board for **team alpha**"); await p.getByRole("button", { name: "Save" }).click(); await saved(p);
  ok(await p.getByTestId("board-menu").locator("strong", { hasText: "team alpha" }).isVisible(), "description saved and rendered as markdown");
  await p.getByTestId("board-menu").getByRole("button", { name: "Back", exact: true }).click(); await p.getByTestId("board-menu").getByRole("button", { name: "Activity", exact: true }).click(); ok(await p.getByTestId("board-menu").getByText("made this board visible to board members only").isVisible(), "activity feed shows the visibility change");
  // labels: create, rename, delete
  await p.getByTestId("board-menu").getByRole("button", { name: "Back", exact: true }).click(); await p.getByTestId("board-menu").getByRole("button", { name: "Labels", exact: true }).click(); await p.getByRole("button", { name: "Create a new label" }).click();
  await p.getByLabel("Title", { exact: true }).fill("Customer"); await p.getByTestId("board-menu").getByRole("button", { name: "bold pink" }).click(); await p.getByTestId("board-menu").getByRole("button", { name: "Create", exact: true }).click(); await saved(p);
  ok(await p.getByRole("button", { name: "Customer label", exact: true }).isVisible(), "label created");
  await p.getByRole("button", { name: "Edit Customer label" }).click(); await p.getByLabel("Title", { exact: true }).fill("Client"); await p.getByTestId("board-menu").getByRole("button", { name: "Save" }).click(); ok(await p.getByRole("button", { name: "Client label", exact: true }).isVisible(), "label renamed");
  await p.getByRole("button", { name: "Edit Client label" }).click(); await p.getByTestId("board-menu").getByRole("button", { name: "Delete", exact: true }).click(); await p.getByTestId("board-menu").getByRole("button", { name: "Delete label" }).click(); ok(!(await p.getByRole("button", { name: "Client label", exact: true }).count()), "label deleted");
  // settings
  await p.getByTestId("board-menu").getByRole("button", { name: "Back", exact: true }).click(); await p.getByTestId("board-menu").getByRole("button", { name: "Settings", exact: true }).click(); await p.getByLabel("Commenting permissions").selectOption("observers"); await saved(p);
  ok((await api(p, "GET", `/api/b/${b.id}`)).json.board.settings.comments === "observers", "commenting permission saved");
  // archive: archive a card + a list, restore and delete from the menu
  const board = (await api(p, "GET", `/api/b/${b.id}`)).json.board; const c1 = board.lists[0].cards[0], c2 = board.lists[0].cards[1], l2 = board.lists[2];
  await api(p, "POST", `/api/b/${b.id}`, { actions: [{ t: "card.patch", cardId: c1.id, patch: { archived: true } }, { t: "card.patch", cardId: c2.id, patch: { archived: true } }, { t: "list.patch", listId: l2.id, archived: true }] });
  await p.reload(); await p.waitForSelector("[data-testid=board-header]"); await p.getByRole("button", { name: "Show menu" }).click(); await p.getByTestId("board-menu").getByRole("button", { name: "Archived items", exact: true }).click();
  const arch = p.getByTestId("archived"); ok(await arch.getByText(c1.title).isVisible() && await arch.getByText(c2.title).isVisible(), "archived cards listed"); await shot(p, "20-archive");
  await arch.locator(".b-archcard", { hasText: c1.title }).getByRole("button", { name: "Restore" }).click(); await saved(p); ok(await p.locator(`[data-card-id="${c1.id}"]`).isVisible(), "card restored to the board");
  await arch.locator(".b-archcard", { hasText: c2.title }).getByRole("button", { name: "Delete" }).click(); await arch.getByRole("button", { name: "Delete" }).first().click(); await saved(p);
  ok(!(await api(p, "GET", `/api/b/${b.id}`)).json.board.lists[0].cards.some(c => c.id === c2.id), "archived card deleted for good");
  await arch.getByRole("button", { name: "Switch to lists" }).click(); await arch.getByRole("button", { name: "Restore" }).click(); await saved(p); ok(await p.locator(`[data-list-id="${l2.id}"]`).isVisible(), "list restored");
  // copy + export + make template + close/reopen
  await p.getByTestId("board-menu").getByRole("button", { name: "Back", exact: true }).click(); await p.getByTestId("board-menu").getByRole("button", { name: "Print, export, and share", exact: true }).click();
  const [dl] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: "Export as JSON" }).click()]); ok(dl.suggestedFilename() === "header-qa.json", "JSON export downloads");
  const [dl2] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: "Export as CSV" }).click()]); ok(dl2.suggestedFilename() === "header-qa.csv", "CSV export downloads");
  await p.getByTestId("board-menu").getByRole("button", { name: "Back", exact: true }).click(); await p.getByTestId("board-menu").getByRole("button", { name: /Make template/ }).click(); await saved(p); ok((await api(p, "GET", `/api/b/${b.id}`)).json.board.isTemplate, "board made a template");
  await p.getByTestId("board-menu").getByRole("button", { name: /Convert to a regular board/ }).click(); await saved(p);
  await p.getByTestId("board-menu").getByRole("button", { name: "Close board", exact: true }).click(); await p.getByRole("button", { name: "Close", exact: true }).click(); await saved(p);
  ok(await p.getByText("This board is closed.").isVisible(), "closed banner shows"); await p.getByRole("button", { name: "Reopen board" }).click(); await saved(p); ok(!(await p.getByText("This board is closed.").count()), "board reopened");
  await p.getByRole("button", { name: "Show menu" }).click(); await p.getByTestId("board-menu").getByRole("button", { name: "Copy board", exact: true }).click(); await p.getByLabel("Title", { exact: true }).fill("Header QA copy"); await p.getByTestId("board-menu").getByRole("button", { name: "Create", exact: true }).click();
  await p.waitForURL(u => !u.toString().includes(b.id)); await p.waitForSelector(".b-list"); ok((await p.locator(".b-list[data-list-id]").count()) === 6, "board copied with its lists");
  // sharing across two accounts
  const sam = await demo(newPage, "demo2"); const ada = await demo(newPage, "demo");
  const adaWs = (await api(ada, "GET", "/api/me")).json.workspaces[0].id; const shared = (await api(ada, "POST", "/api/boards", { title: "Ada shares " + Date.now().toString(36), workspaceId: adaWs, visibility: "private" })).json.board;
  await ada.goto(`${BASE}/app/b/${shared.id}`); await ada.getByTestId("share-btn").click(); await ada.getByLabel("Email address").fill("sam@demo.yourappisdead.com"); await ada.getByTestId("share-dialog").getByRole("button", { name: "Share", exact: true }).click(); await ada.waitForSelector("text=was added to the board");
  ok((await ada.getByTestId("board-members").locator(".b-mrow").count()) === 2, "Sam listed as a board member"); await shot(ada, "12-share");
  await ada.getByLabel("Role for Sam Rivera").selectOption("observer"); await saved(ada); await ada.keyboard.press("Escape");
  await sam.goto(`${BASE}/app/b/${shared.id}`); await sam.waitForSelector("[data-testid=board-header]");
  ok(await sam.locator(".b-add").count() === 0, "observer sees no add-card buttons");
  const res = await api(sam, "POST", `/api/b/${shared.id}`, { actions: [{ t: "list.add", listId: "lhack0001", title: "x", index: 0 }] }); ok(!res.json.board.lists.some(l => l.id === "lhack0001"), "observer edits are rejected by the server");
  await ada.getByTestId("share-btn").click(); await ada.getByLabel("Role for Sam Rivera").selectOption("normal"); await saved(ada); await ada.keyboard.press("Escape");
  await sam.waitForSelector(".b-add", { timeout: 10000 }); ok(true, "promotion reaches Sam through polling");
  await sam.locator(".b-add").first().click(); await sam.getByLabel("Enter a title for this card").fill("Sam was here"); await sam.keyboard.press("Enter"); await saved(sam);
  await ada.waitForSelector("text=Sam was here", { timeout: 10000 }); ok(true, "Sam's card appears on Ada's screen without a reload");
  // workspace member joins a workspace-visible board
  const team = (await api(ada, "POST", "/api/workspaces", { name: "Join test " + Date.now().toString(36) })).json.workspace; await api(ada, "POST", `/api/workspaces/${team.id}/members`, { email: "sam@demo.yourappisdead.com" });
  const wb = (await api(ada, "POST", "/api/boards", { title: "Workspace board", workspaceId: team.id, visibility: "workspace" })).json.board;
  await sam.goto(`${BASE}/app/b/${wb.id}`); await sam.getByTestId("join-banner").getByRole("button", { name: "Join board" }).click(); await sam.waitForSelector(".b-add"); ok(true, "Workspace member joins the board");
  // share link
  const priv = (await api(ada, "POST", "/api/boards", { title: "Link board", workspaceId: adaWs, visibility: "private" })).json.board;
  await ada.goto(`${BASE}/app/b/${priv.id}`); await ada.getByTestId("share-btn").click(); await ada.getByRole("button", { name: "Create link" }).click(); await ada.waitForSelector("text=Link copied");
  const link = (await ada.getByTestId("share-dialog").locator("code").textContent()).trim(); await sam.goto(link); await sam.getByRole("button", { name: "Join" }).click(); await sam.waitForURL(/\/app\/b\//); await sam.waitForSelector(".b-add"); ok(true, "Sam joins through the share link");
});
