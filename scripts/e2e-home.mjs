// Boards home, create-board popover, backgrounds, templates, workspaces, closed boards. (#9 #10 #11 #19 #23)
import fs from "node:fs";
import { run, ok, guest, api, settle, saved, shot, BASE } from "./e2e-lib.mjs";
await run("e2e-home", async ({ newPage }) => {
  const p = await guest(newPage);
  ok(await p.getByRole("link", { name: "Boards" }).first().isVisible() && await p.getByRole("link", { name: "Templates" }).first().isVisible() && await p.getByRole("link", { name: "Home" }).first().isVisible(), "sidebar has Boards, Templates, Home");
  ok(await p.getByText("Guest Workspace").first().isVisible(), "default Workspace listed");
  // create a board with a photo background, private
  await p.getByRole("button", { name: "Create new board" }).first().click();
  const form = p.locator("[data-testid=create-board]"); await shot(p, "10-create-board");
  ok(await form.getByRole("button", { name: /Photo by/ }).count() >= 4, "create popover offers photos");
  ok(await form.getByRole("button", { name: "Create" }).isDisabled(), "Create disabled until a title is entered");
  await form.getByRole("button", { name: /Photo by/ }).nth(2).click();
  await form.getByLabel("Board title").fill("QA Photo board");
  await form.getByLabel("Visibility").selectOption("private");
  ok(await form.getByRole("link", { name: "Start with a template" }).isVisible(), "Start with a template link present");
  await form.getByRole("button", { name: "Create" }).click();
  await p.waitForURL(/\/app\/b\//); await p.waitForSelector(".b-list");
  ok(/\/bg\/p\d+\.jpg/.test(await p.locator(".b-root").getAttribute("style")), "board uses the chosen photo");
  ok((await p.locator(".b-list[data-list-id]").count()) === 3, "new board starts with To do / Doing / Done");
  const boardUrl = p.url(); const boardId = boardUrl.split("/b/")[1].split("?")[0];
  // background: colour, then upload
  await p.getByRole("button", { name: "Show menu" }).click(); await p.getByTestId("board-menu").getByRole("button", { name: "Change background" }).click(); const bgp = p.getByTestId("board-menu"); await shot(p, "19-background-picker"); await bgp.getByRole("button", { name: "More backgrounds" }).click(); await bgp.getByRole("button", { name: "Grape" }).click(); await saved(p);
  ok((await p.locator(".b-root").getAttribute("style")).includes("6E5DC6") || (await p.locator(".b-root").getAttribute("style")).includes("110, 93, 198"), "colour background applied");
  await bgp.getByRole("button", { name: "‹ Back" }).click();
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGNk+M/AwMDAxMDAwMDAAAAZAAJzPZ0uAAAAAElFTkSuQmCC", "base64"); fs.writeFileSync("/tmp/trello-e2e-bg.png", png);
  await bgp.locator("input[type=file]").setInputFiles("/tmp/trello-e2e-bg.png"); await p.waitForFunction(() => /api\/files\//.test(document.querySelector(".b-root")?.getAttribute("style") ?? ""), null, { timeout: 8000 }); await saved(p);
  ok(true, "uploaded background applied");
  const bgUrl = (await p.locator(".b-root").getAttribute("style")).match(/url\("?([^")]+)/)[1]; const r = await p.request.get(new URL(bgUrl, BASE).toString()); ok(r.status() === 200 && r.headers()["content-type"] === "image/png", "uploaded background is served");
  // star from the board, check it shows on the boards page
  await p.getByRole("button", { name: "Close menu" }).click(); await p.getByRole("button", { name: "Star board" }).click(); await settle(p, 600);
  await p.goto(BASE + "/app"); await p.waitForSelector("[data-testid=boards]");
  ok(await p.getByRole("heading", { name: "Starred boards" }).isVisible(), "Starred boards section appears"); await shot(p, "09-boards-home");
  ok(await p.getByRole("heading", { name: "Recently viewed" }).isVisible(), "Recently viewed section appears");
  await p.getByRole("button", { name: "Starred" }).click(); ok(await p.locator(".tr-pop").getByText("QA Photo board").isVisible(), "Starred header menu lists the board"); await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "Recent" }).click(); ok(await p.locator(".tr-pop").getByText("QA Photo board").isVisible(), "Recent header menu lists the board"); await p.keyboard.press("Escape");
  // templates
  await p.getByRole("link", { name: "Templates" }).first().click(); await p.waitForSelector("[data-testid=templates]");
  ok((await p.locator("[data-template]").count()) >= 12, "template gallery lists 12 templates"); await shot(p, "11-templates");
  await p.getByRole("tab", { name: "Engineering" }).click(); ok((await p.locator("[data-template]").count()) === 1, "category filter narrows the gallery");
  await p.getByRole("button", { name: "Use template" }).first().click(); await shot(p, "11-template-preview"); await p.getByRole("dialog").getByRole("button", { name: "Use template" }).click();
  await p.waitForURL(/\/app\/b\//); await p.waitForSelector(".b-list");
  ok((await p.locator(".b-list[data-list-id]").count()) === 6 && (await p.locator("[data-card-id]").count()) >= 6, "template board has its lists and cards");
  // workspaces
  await p.goto(BASE + "/app"); await p.waitForSelector("[data-testid=boards]");
  await p.getByRole("button", { name: "Create a Workspace" }).click(); await p.getByLabel("Workspace name").fill("QA Team"); await p.getByLabel("Workspace type").selectOption("engineering"); await p.getByRole("button", { name: "Continue" }).click();
  await p.waitForURL(/\/app\/w\//); await p.waitForSelector("[data-testid=ws-boards]");
  ok(await p.getByRole("heading", { name: "QA Team" }).isVisible(), "new Workspace page opens");
  await p.getByRole("button", { name: "Create new board" }).click(); await p.getByLabel("Board title").fill("Team board"); await p.locator("[data-testid=create-board]").getByRole("button", { name: "Create" }).click(); await p.waitForURL(/\/app\/b\//);
  await p.goBack(); await p.waitForSelector("[data-testid=ws-boards]"); await p.reload(); await p.waitForSelector("[data-testid=ws-boards]");
  ok(await p.locator(".tr-tile a", { hasText: "Team board" }).isVisible(), "board created in the new Workspace");
  await p.getByRole("link", { name: "Settings" }).last().click(); await p.waitForSelector("[data-testid=ws-settings]");
  await p.getByLabel("Name", { exact: true }).fill("QA Team Renamed"); await p.getByRole("button", { name: "Save" }).click(); await p.waitForSelector("text=Saved.");
  ok(await p.getByRole("heading", { name: "QA Team Renamed" }).isVisible(), "Workspace renamed");
  await p.getByRole("link", { name: /^Members/ }).last().click(); await p.waitForSelector("[data-testid=ws-members]");
  ok((await p.locator("[data-testid=ws-member-list] tr").count()) === 1, "members page lists the one member"); await shot(p, "23-workspace-members");
  await p.getByLabel("Email address").fill("someone@example.com"); await p.getByRole("button", { name: "Invite", exact: true }).click();
  ok(await p.getByRole("dialog").getByText("Sign in to keep going").isVisible(), "guests get a sign-in prompt for invites");
  await p.getByRole("button", { name: "Not now" }).click();
  // closed boards: close via the API, reopen and delete through the UI
  const c = await api(p, "POST", `/api/b/${boardId}`, { actions: [{ t: "board.patch", patch: { closed: true } }] }); ok(c.status === 200 && c.json.board.closed, "board closed");
  await p.goto(BASE + "/app"); await p.waitForSelector("[data-testid=boards]"); ok(!(await p.locator(".tr-tile a", { hasText: "QA Photo board" }).count()), "closed board hidden from the boards page");
  await p.getByRole("button", { name: "View all closed boards" }).click(); const dlg = p.getByRole("dialog"); await dlg.getByRole("button", { name: "Reopen" }).click(); await p.waitForSelector("text=is open again");
  await api(p, "POST", `/api/b/${boardId}`, { actions: [{ t: "board.patch", patch: { closed: true } }] }); await p.reload(); await p.getByRole("button", { name: "View all closed boards" }).click();
  await p.getByRole("dialog").getByRole("button", { name: "Delete" }).click(); await p.getByRole("button", { name: "Delete forever" }).click(); await p.waitForSelector("text=was deleted");
  ok((await api(p, "GET", `/api/b/${boardId}`)).status === 404, "deleted board is gone");
  // persistence across reload
  await p.reload(); await p.waitForSelector("[data-testid=boards]"); ok(await p.getByText("QA Team Renamed").first().isVisible(), "Workspaces persist across reload");
});
