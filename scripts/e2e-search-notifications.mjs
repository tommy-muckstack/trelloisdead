// Global search and notifications. (#24 #25)
import { run, ok, guest, demo, api, saved, shot, BASE } from "./e2e-lib.mjs";
await run("e2e-search-notifications", async ({ newPage }) => {
  const p = await guest(newPage); const ws = (await api(p, "GET", "/api/me")).json.workspaces[0].id;
  const b = (await api(p, "POST", "/api/boards", { title: "Search QA", workspaceId: ws, template: "sprint" })).json.board;
  await p.reload(); await p.waitForSelector("[data-testid=boards]");
  const hs = p.getByTestId("header-search"); await hs.getByRole("searchbox", { name: "Search" }).fill("date picker"); await hs.locator(".tr-mi", { hasText: "Fix the date picker on Safari" }).waitFor();
  ok(true, "header search shows matching cards as you type"); await shot(p, "24-header-search");
  await hs.locator(".tr-mi", { hasText: "Fix the date picker on Safari" }).click(); await p.getByTestId("card-modal").waitFor(); ok(p.url().includes(`/app/b/${b.id}?card=`), "clicking a result opens the card");
  await p.keyboard.press("Escape");
  await hs.getByRole("searchbox", { name: "Search" }).fill("search qa"); ok(await hs.locator(".tr-mi", { hasText: "Search QA" }).first().isVisible(), "boards match by title");
  await hs.getByRole("searchbox", { name: "Search" }).fill("backlog"); await hs.getByRole("searchbox", { name: "Search" }).press("Enter"); await p.waitForURL(/\/app\/search\?q=backlog/); ok(await p.getByTestId("search-page").isVisible(), "Enter opens the search page");
  const sp = p.getByTestId("search-page"); const box = sp.getByLabel("Search cards and boards");
  await box.fill("#bug"); await sp.getByTestId("search-cards").locator("a").first().waitFor(); ok((await sp.getByTestId("search-cards").locator("a").count()) === 1, "#label operator");
  await box.fill("list:progress"); await p.waitForTimeout(700); ok((await sp.getByTestId("search-cards").locator("a").allInnerTexts()).every(t => t.includes("In progress")), "list: operator");
  await box.fill("has:description"); await p.waitForTimeout(700); ok((await sp.getByTestId("search-cards").locator("a").count()) >= 1, "has: operator");
  await box.fill("Velocity"); await p.waitForTimeout(700); ok((await sp.getByTestId("search-cards").locator("a").count()) === 1, "finds text inside checklist items"); await shot(p, "24-search-page");
  // notifications between two accounts
  const sam = await demo(newPage, "demo2"); const ada = await demo(newPage, "demo");
  const aws = (await api(ada, "GET", "/api/me")).json.workspaces[0].id; const sb = (await api(ada, "POST", "/api/boards", { title: "Notify " + Date.now().toString(36), workspaceId: aws, template: "kanban" })).json.board;
  await api(ada, "POST", `/api/b/${sb.id}/members`, { email: "sam@demo.yourappisdead.com", role: "normal" });
  await api(sam, "PATCH", "/api/me", { readAll: true }); const samId = (await api(sam, "GET", "/api/me")).json.user.id; const cid = sb.lists[1].cards[0].id;
  await ada.goto(`${BASE}/app/b/${sb.id}?card=${cid}`); const m = ada.getByTestId("card-modal"); await m.waitFor();
  await m.getByRole("button", { name: "Members", exact: true }).click(); await ada.getByTestId("members-pop").getByRole("menuitemcheckbox", { name: /Sam Rivera/ }).click(); await ada.keyboard.press("Escape"); await saved(ada);
  await m.getByRole("button", { name: "Write a comment…" }).click(); await m.getByLabel("Write a comment").type("Can you take this @sa"); await m.getByLabel("Write a comment").press("Enter"); await m.getByRole("button", { name: "Save", exact: true }).click(); await saved(ada);
  const soon = new Date(Date.now() + 30 * 6e4); await api(ada, "POST", `/api/b/${sb.id}`, { actions: [{ t: "card.patch", cardId: cid, patch: { due: soon.toISOString(), reminder: 60 } }] });
  await sam.reload(); await sam.waitForSelector("[data-testid=boards]"); const bell = sam.getByTestId("notifications");
  ok((await bell.getByRole("button", { name: /Notifications \(\d+ unread\)/ }).getAttribute("aria-label")).includes("3 unread"), "bell shows 3 unread (assigned, mention, due reminder)");
  await bell.getByRole("button", { name: /Notifications/ }).click(); const items = await bell.locator(".tr-notif").allInnerTexts(); await shot(sam, "25-notifications");
  ok(items.some(t => t.includes("added you to the card")) && items.some(t => t.includes("mentioned you")) && items.some(t => t.includes("is due")), "assignment, mention and reminder notifications listed");
  await bell.locator(".tr-notif", { hasText: "mentioned you" }).locator(".tr-notif__body").click(); await sam.waitForURL(/card=/); await sam.getByTestId("card-modal").waitFor(); ok(sam.url().includes(cid), "clicking a notification opens the card");
  await sam.keyboard.press("Escape"); await bell.getByRole("button", { name: /Notifications/ }).click(); await bell.getByRole("button", { name: "Mark all as read" }).click(); await sam.waitForTimeout(500);
  ok((await bell.getByRole("button", { name: /^Notifications/ }).first().getAttribute("aria-label")) === "Notifications", "mark all as read clears the badge");
  void samId;
});
