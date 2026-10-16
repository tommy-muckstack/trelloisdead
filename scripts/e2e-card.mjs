// Card back and card-front badges. (#15 #16)
import fs from "node:fs";
import { run, ok, guest, api, saved, shot, BASE } from "./e2e-lib.mjs";
await run("e2e-card", async ({ newPage }) => {
  const p = await guest(newPage); const ws = (await api(p, "GET", "/api/me")).json.workspaces[0].id;
  const b = (await api(p, "POST", "/api/boards", { title: "Card QA", workspaceId: ws, template: "kanban" })).json.board;
  await p.goto(`${BASE}/app/b/${b.id}`); await p.waitForSelector(".b-list");
  const tile = () => p.locator('.b-list[aria-label="To do"] [data-card-id]').first(); const cardId = await tile().getAttribute("data-card-id");
  await tile().click(); const m = p.getByTestId("card-modal"); await m.waitFor();
  ok(p.url().includes(`card=${cardId}`), "opening a card puts it in the URL");
  const pop = () => p.locator(".c-pop").last();
  // title
  await m.getByLabel("Card title").fill("Plan the launch party"); await m.getByLabel("Card title").press("Enter"); await saved(p);
  ok((await tile().locator(".b-card__t").innerText()).includes("Plan the launch party"), "title edit shows on the card front");
  // labels (toggle existing + create new from the card)
  await m.getByRole("button", { name: "Labels", exact: true }).click(); await pop().getByRole("checkbox", { name: "Label Urgent", exact: true }).check(); await pop().getByRole("button", { name: "Create a new label", exact: true }).click();
  await pop().getByLabel("Title", { exact: true }).fill("Party"); await pop().getByRole("button", { name: "bold purple", exact: true }).click(); await pop().getByRole("button", { name: "Create", exact: true }).click(); await p.keyboard.press("Escape"); await saved(p);
  const lbls = await m.locator(".c-lbl").allInnerTexts(); ok(lbls.includes("Urgent") && lbls.includes("Party"), "labels added, including a new named label");
  // members
  await m.getByRole("button", { name: "Members", exact: true }).click(); await pop().getByRole("menuitemcheckbox", { name: /Guest/ }).click(); await p.keyboard.press("Escape"); await saved(p);
  ok(await m.locator(".c-chip", { hasText: "Members" }).locator(".tr-av").count() === 1, "member added");
  // dates: start + due + time + reminder
  const d = new Date(Date.now() + 3 * 864e5); const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  await m.getByRole("button", { name: "Dates", exact: true }).click(); const dp = p.getByTestId("dates-pop");
  await dp.getByLabel("Enable start date").check(); await dp.getByLabel("Due date", { exact: true }).fill(ymd); await dp.getByLabel("Due time").fill("15:30"); await dp.getByLabel("Set due date reminder").selectOption("1440"); await dp.getByRole("button", { name: "Save", exact: true }).click(); await saved(p);
  let card = (await api(p, "GET", `/api/b/${b.id}`)).json.board.lists[1].cards.find(c => c.id === cardId);
  ok(card.start && new Date(card.due).getHours() === 15 && card.reminder === 1440, "start date, due date/time and reminder saved");
  ok(await tile().locator(".b-badge.due").innerText().then(t => t.includes("–")), "front shows the date range");
  await m.getByLabel("Mark due date complete").check(); await saved(p); ok(await tile().locator(".b-badge.due.complete").count() === 1, "complete due date turns the badge green");
  // checklists
  await m.getByRole("button", { name: "Checklist", exact: true }).click(); await pop().getByLabel("Title").fill("Prep"); await pop().getByRole("button", { name: "Add", exact: true }).click();
  const ck = m.locator("[data-checklist]").first(); await ck.getByRole("button", { name: "Add an item", exact: true }).click();
  for (const t of ["Book venue", "Order cake", "Send invites"]) { await ck.getByLabel("Add an item").fill(t); await ck.getByLabel("Add an item").press("Enter"); }
  await ck.getByLabel("Add an item").press("Escape"); await ck.getByRole("checkbox", { name: "Book venue", exact: true }).check(); await saved(p);
  ok((await ck.getByRole("progressbar").getAttribute("aria-valuenow")) === "33", "checklist progress is 33%");
  await m.getByRole("button", { name: "Checklist", exact: true }).click(); await pop().getByLabel("Title").fill("Follow-up"); await pop().getByRole("button", { name: "Add", exact: true }).click(); await saved(p);
  ok(await m.locator("[data-checklist]").count() === 2, "second named checklist added");
  await ck.getByRole("button", { name: "Hide checked items", exact: true }).click(); ok(!(await ck.getByRole("checkbox", { name: "Book venue", exact: true }).count()), "hide checked items");
  await ck.getByRole("button", { name: /Show checked items/ }).click();
  await ck.locator(".c-item", { hasText: "Send invites" }).hover(); await ck.locator(".c-item", { hasText: "Send invites" }).getByRole("button", { name: "Item actions", exact: true }).click(); await pop().getByRole("button", { name: "Convert to card", exact: true }).click(); await saved(p);
  ok(await p.locator('.b-list[aria-label="To do"] .b-card__t', { hasText: "Send invites" }).count() === 1, "checklist item converted to a card");
  await m.locator("[data-checklist]").nth(1).getByRole("button", { name: /^Delete/ }).click(); await pop().getByRole("button", { name: "Delete checklist", exact: true }).click(); await saved(p);
  ok(await m.locator("[data-checklist]").count() === 1, "checklist deleted after confirming");
  // description (markdown)
  await m.getByRole("button", { name: "Add a more detailed description…", exact: true }).click(); await m.getByRole("textbox", { name: "Description", exact: true }).fill("Budget is **$500**.\n\n- snacks\n- music"); await m.getByRole("button", { name: "Save", exact: true }).click(); await saved(p);
  ok(await m.locator(".c-desc strong", { hasText: "$500" }).isVisible() && await m.locator(".c-desc li").count() === 2, "description renders Markdown");
  // attachments: image upload (becomes the cover), link, rename, delete
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGNk+M/AwMDAxMDAwMDAAAAZAAJzPZ0uAAAAAElFTkSuQmCC", "base64"); fs.writeFileSync("/tmp/trello-e2e-photo.png", png);
  await m.getByRole("button", { name: "Attachment", exact: true }).click(); await p.getByTestId("attach-pop").getByLabel("Choose a file").setInputFiles("/tmp/trello-e2e-photo.png");
  await m.locator(".c-atts li").first().waitFor(); await saved(p);
  ok(await tile().locator(".b-card__img").count() === 1, "first image attachment becomes the cover on the front");
  await m.getByRole("button", { name: "Attachment", exact: true }).click(); const ap = p.getByTestId("attach-pop"); await ap.getByLabel(/Search or paste a link/).fill("example.com/spec"); await ap.getByLabel(/Display text/).fill("Spec doc"); await ap.getByRole("button", { name: "Insert", exact: true }).click(); await saved(p);
  ok(await m.locator(".c-att__name", { hasText: "Spec doc" }).count() === 1, "link attachment added");
  await m.locator(".c-atts li", { hasText: "Spec doc" }).getByRole("button", { name: "Edit", exact: true }).click(); await m.getByLabel("Attachment name").fill("Product spec"); await m.getByLabel("Attachment name").press("Enter"); await saved(p);
  ok(await m.locator(".c-att__name", { hasText: "Product spec" }).count() === 1, "attachment renamed");
  await m.locator(".c-atts li", { hasText: "Product spec" }).getByRole("button", { name: "Delete", exact: true }).click(); await m.getByRole("button", { name: "Delete attachment", exact: true }).click(); await saved(p);
  ok(await m.locator(".c-atts li").count() === 1, "attachment deleted");
  const att = await m.locator(".c-att__name").first().getAttribute("href"); const r = await p.request.get(new URL(att, BASE).toString()); ok(r.status() === 200, "uploaded file is downloadable by a board member");
  // cover colour + full size
  await m.getByRole("button", { name: "Cover", exact: true }).click(); await p.getByTestId("cover-pop").getByRole("button", { name: "green cover", exact: true }).click(); await p.getByTestId("cover-pop").getByRole("button", { name: "Full-card cover", exact: true }).click(); await p.keyboard.press("Escape"); await saved(p);
  ok(await tile().evaluate(e => e.classList.contains("full")), "full colour cover on the front");
  await m.getByRole("button", { name: "Cover", exact: true }).click(); await p.getByTestId("cover-pop").getByRole("button", { name: "Remove cover", exact: true }).click(); await p.keyboard.press("Escape"); await saved(p);
  // custom fields through the Add menu (adds the Power-Up)
  await m.getByTestId("add-menu").click(); await pop().getByRole("button", { name: /Custom Fields/ }).click(); await pop().getByRole("button", { name: "Add the Custom Fields Power-Up", exact: true }).click(); await saved(p);
  await pop().getByRole("button", { name: "+ New field", exact: true }).click(); await pop().getByLabel("Title").fill("Estimate"); await pop().getByLabel("Type").selectOption("number"); await pop().getByRole("button", { name: "Create", exact: true }).click(); await p.keyboard.press("Escape"); await saved(p);
  await m.getByRole("textbox", { name: "Estimate", exact: true }).or(m.locator(".c-field", { hasText: "Estimate" }).locator("input")).first().fill("5"); await m.getByLabel("Card title").click(); await saved(p);
  ok(await tile().locator(".b-badge.field").innerText().then(t => t.includes("Estimate: 5")), "custom field value shows on the front");
  // location (OpenStreetMap search; falls back to setting coordinates if the network is unavailable)
  await m.getByTestId("add-menu").click(); await pop().getByRole("button", { name: /Location/ }).click(); const lp = p.getByTestId("location-pop"); await lp.getByLabel("Search for a location").fill("Golden Gate Park San Francisco"); await lp.getByRole("button", { name: "Search", exact: true }).click();
  await p.waitForTimeout(2500); const hits = await lp.locator(".tr-mi").count();
  if (hits) { await lp.locator(".tr-mi").first().click(); ok(true, `place search returned ${hits} results`); } else { await p.keyboard.press("Escape"); await api(p, "POST", `/api/b/${b.id}`, { actions: [{ t: "card.patch", cardId, patch: { location: { name: "Golden Gate Park", address: "San Francisco, CA", lat: 37.7694, lng: -122.4862 } } }] }); await p.reload(); await m.waitFor(); ok(true, "place search unavailable offline; location set directly"); }
  await saved(p); ok(await m.getByRole("region", { name: "Location", exact: true }).isVisible() && await tile().locator(".b-badge", { has: p.locator("svg.lucide-map-pin") }).count() === 1, "location shows on the back and front");
  // comments with @mention autocomplete, edit, delete
  await m.getByRole("button", { name: "Write a comment…", exact: true }).click(); const box = m.getByLabel("Write a comment"); await box.type("Thanks @gu"); ok(await m.getByRole("listbox", { name: "Mention someone", exact: true }).isVisible(), "@ opens the mention list");
  await box.press("Enter"); await box.type("for the plan"); await m.getByRole("button", { name: "Save", exact: true }).click(); await saved(p);
  ok(await m.locator(".c-feed__c .md-mention").innerText() === "@guest", "comment saved with a mention");
  await m.locator(".c-feed__c").first().getByRole("button", { name: "Edit", exact: true }).click(); await m.getByLabel("Edit comment").fill("Updated comment"); await m.getByRole("button", { name: "Save", exact: true }).click(); await saved(p);
  ok(await m.locator(".c-feed__c").first().innerText().then(t => t.includes("Updated comment") && t.includes("(edited)")), "comment edited");
  await m.getByRole("button", { name: "Write a comment…", exact: true }).click(); await m.getByLabel("Write a comment").fill("Second comment"); await m.getByRole("button", { name: "Save", exact: true }).click(); await saved(p);
  await m.locator(".c-feed__c", { hasText: "Second comment" }).getByRole("button", { name: "Delete", exact: true }).click(); await m.getByRole("button", { name: "Delete comment", exact: true }).click(); await saved(p);
  ok(await m.locator(".c-feed__c").count() === 1, "comment deleted after confirming");
  ok(await m.locator(".c-feed__a").count() > 3, "activity entries shown with details"); await m.getByRole("button", { name: "Hide details", exact: true }).click(); ok(await m.locator(".c-feed__a").count() === 0, "Hide details hides activity");
  await shot(p, "15-card-back", { fullPage: false });
  // watch, front badges
  ok(await tile().locator(".b-badge[title='You are watching this card.']").count() === 1, "commenting watches the card (eye badge)");
  for (const [t, label] of [["Comments", "comment count"], ["Attachments", "attachment count"], ["Checklist items", "checklist count"], ["This card has a description.", "description"]]) ok(await tile().locator(`.b-badge[title="${t}"]`).count() === 1, `front badge: ${label}`);
  ok(await tile().locator(".b-members .tr-av").count() === 1, "front shows member avatars");
  // actions: copy, move via list chip, template, archive/send back, link
  await m.getByTestId("card-actions").click(); await pop().getByRole("button", { name: "Copy", exact: true }).click(); const cp = p.getByTestId("copy-pop"); await cp.getByLabel("Name").fill("Copied card"); await cp.getByRole("button", { name: "Create card", exact: true }).click(); await saved(p);
  ok(await p.locator(".b-card__t", { hasText: "Copied card" }).count() === 1, "card copied");
  await m.getByRole("button", { name: /^In list/ }).click(); const mp = p.getByTestId("move-pop"); await mp.getByLabel("List").selectOption({ label: "Done" }); await mp.getByRole("button", { name: "Move", exact: true }).click(); await saved(p);
  ok(await m.getByRole("button", { name: /^In list Done/ }).isVisible() && await p.locator(`.b-list[aria-label="Done"] [data-card-id="${cardId}"]`).count() === 1, "card moved to Done from the list chip");
  await m.getByTestId("card-actions").click(); await pop().getByRole("button", { name: "Make template", exact: true }).click(); await saved(p); ok(await m.getByText("This is a Template card.").isVisible(), "template banner shows");
  const before = await p.locator(`.b-list[aria-label="Done"] [data-card-id]`).count(); await m.getByRole("button", { name: "Create card from template", exact: true }).click(); await saved(p); ok(await p.locator(`.b-list[aria-label="Done"] [data-card-id]`).count() === before + 1, "card created from the template");
  await m.getByTestId("card-actions").click(); await pop().getByRole("button", { name: "Archive", exact: true }).click(); await saved(p); ok(await m.getByText("This card is archived.").isVisible(), "archived banner shows");
  await m.getByRole("button", { name: "Send to board", exact: true }).click(); await saved(p);
  await m.getByTestId("card-actions").click(); await pop().getByRole("button", { name: "Copy link", exact: true }).click(); ok(await p.locator(".tr-toast", { hasText: /Link to this card copied|\/app\/b\// }).first().waitFor({ timeout: 5000 }).then(() => true, () => false), "copy link");
  await p.keyboard.press("Escape"); await p.waitForFunction(() => !location.search.includes("card="));
  // labels collapse on the front
  await p.locator(`[data-card-id="${cardId}"] .b-card__lbls .b-label`).first().click(); ok(await p.locator(".b-card__lbls.collapsed").count() > 0, "clicking a label collapses label text"); await p.locator(".b-card__lbls .b-label").first().click();
  await shot(p, "16-badges");
  // persistence
  await p.reload(); await p.waitForSelector(".b-list"); await p.goto(`${BASE}/app/b/${b.id}?card=${cardId}`); await m.waitFor();
  ok(await m.locator(".c-lbl").count() === lbls.length && await m.locator("[data-checklist]").count() === 1 && await m.locator(".c-desc strong").count() === 1 && await m.locator(".c-feed__c").count() === 1, "everything survives a reload (deep link opens the card)");
});
