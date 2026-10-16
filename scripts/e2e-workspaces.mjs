// Workspace members across two real accounts: invite by email, invite link, roles, leave. (#23)
import { run, ok, demo, api, BASE } from "./e2e-lib.mjs";
await run("e2e-workspaces", async ({ newPage }) => {
  const sam = await demo(newPage, "demo2"); const ada = await demo(newPage, "demo");
  // Ada creates a workspace and invites Sam by email (existing account → added straight away)
  const ws = (await api(ada, "POST", "/api/workspaces", { name: "Launch crew " + Date.now().toString(36) })).json.workspace;
  await ada.goto(`${BASE}/app/w/${ws.id}/members`); await ada.waitForSelector("[data-testid=ws-members]");
  await ada.getByLabel("Email address").fill("sam@demo.yourappisdead.com"); await ada.getByRole("button", { name: "Invite", exact: true }).click(); await ada.waitForSelector("text=is now a member");
  ok((await ada.locator("[data-testid=ws-member-list] tr").count()) === 2, "Sam added to the Workspace");
  await sam.reload(); await sam.waitForSelector("[data-testid=boards]");
  ok(await sam.getByText(ws.name).first().isVisible(), "Workspace shows up for Sam");
  // invite someone without an account: pending invite, cancel
  await ada.getByLabel("Email address").fill("newperson@example.com"); await ada.getByRole("button", { name: "Invite", exact: true }).click(); await ada.waitForSelector("text=Pending invitations (1)");
  ok(true, "pending invitation listed"); await ada.getByRole("button", { name: "Cancel" }).click(); await ada.waitForFunction(() => !document.body.innerText.includes("Pending invitations"));
  ok(true, "pending invitation cancelled");
  // roles
  await ada.getByLabel("Role for Sam Rivera").selectOption("admin"); await ada.waitForTimeout(500); await ada.reload(); await ada.waitForSelector("[data-testid=ws-members]");
  ok(await ada.getByLabel("Role for Sam Rivera").inputValue() === "admin", "Sam promoted to admin");
  // invite link: create, Sam leaves, rejoins by link
  await ada.getByRole("button", { name: "Create invite link" }).click(); await ada.waitForSelector("text=Invite link copied");
  const link = await ada.locator("code").first().textContent(); ok(/\/app\/join\//.test(link), "invite link created");
  await sam.goto(`${BASE}/app/w/${ws.id}/members`); await sam.waitForSelector("[data-testid=ws-members]"); await sam.getByRole("button", { name: "Leave" }).click(); await sam.waitForURL(/\/app$/);
  ok(!(await sam.getByText(ws.name).count()), "Sam left the Workspace");
  await sam.goto(link); await sam.getByRole("button", { name: "Join" }).click(); await sam.waitForURL(/\/app\/w\//); await sam.waitForSelector("[data-testid=ws-boards]");
  ok(await sam.getByRole("heading", { name: ws.name }).isVisible(), "Sam rejoined through the invite link");
  // Workspace-visible boards appear for members; private ones don't
  const pub = (await api(ada, "POST", "/api/boards", { title: "Team-visible", workspaceId: ws.id, visibility: "workspace" })).json.board;
  const priv = (await api(ada, "POST", "/api/boards", { title: "Ada only", workspaceId: ws.id, visibility: "private" })).json.board;
  await sam.reload(); await sam.waitForSelector("[data-testid=ws-boards]");
  ok(await sam.locator(".tr-tile a", { hasText: "Team-visible" }).isVisible() && !(await sam.locator(".tr-tile a", { hasText: "Ada only" }).count()), "Sam sees Workspace boards but not private ones");
  ok((await api(sam, "GET", `/api/b/${priv.id}`)).status === 404, "private board is not readable by Sam");
  ok((await api(sam, "POST", `/api/b/${pub.id}`, { actions: [{ t: "board.patch", patch: { title: "hijack" } }] })).status === 403, "Sam must join before editing");
  // delete workspace (type the name)
  await ada.goto(`${BASE}/app/w/${ws.id}/settings`); await ada.getByRole("button", { name: "Delete this Workspace?" }).click(); await ada.getByLabel("Workspace name to confirm").fill(ws.name); await ada.getByRole("button", { name: "Delete Workspace" }).click(); await ada.waitForURL(/\/app$/);
  ok((await api(ada, "GET", `/api/b/${pub.id}`)).status === 404, "deleting the Workspace deletes its boards");
});
