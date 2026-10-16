// Server data layer against the file store in a temp dir: migration, guest adoption, invites, notifications, reminders.
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
process.env.ISDEAD_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "trello-test-"));
const D = await import("@/lib/server/data"); const S = await import("@/lib/store");
type SU = { id: string; name: string; email: string; demo: boolean; guest: boolean };
const ada: SU = { id: "uada000001", name: "Ada Lovelace", email: "ada@example.com", demo: false, guest: false };
const sam: SU = { id: "usam000001", name: "Sam Rivera", email: "sam@example.com", demo: false, guest: false };
const guest: SU = { id: "g_guestguestguest01", name: "Guest", email: "", demo: false, guest: true };

describe("users and migration", () => {
  it("creates a workspace and a first board for new users", async () => { const me = await D.loadMe(ada); expect(me.workspaces).toHaveLength(1); expect(me.boards).toHaveLength(1); expect(me.boards[0]!.role).toBe("admin"); });
  it("migrates pre-workspace boards (one JSON doc per user) and deletes the old doc", async () => {
    const legacy = { boards: [{ id: "blegacy01", title: "Old board", bg: "forest", createdAt: "2026-01-01T00:00:00Z", lists: [{ id: "llegacy01", title: "L", archived: false, cards: [{ id: "clegacy01", title: "C", desc: "d", labels: ["red"], due: "2026-02-01", checklist: [{ id: "ilegacy01", text: "x", done: true }], archived: false, createdAt: "2026-01-01T00:00:00Z" }] }] }] };
    const u: SU = { id: "uold000001", name: "Old Timer", email: "old@example.com", demo: false, guest: false }; await S.putDoc("boards", u.id, legacy);
    const me = await D.loadMe(u); expect(me.boards.map(b => b.title)).toEqual(["Old board"]); const b = (await D.getBoard("blegacy01"))!;
    const c = b.lists[0]!.cards[0]!; expect(c.labels).toHaveLength(1); expect(b.labels.find(l => l.id === c.labels[0])!.color).toBe("red"); expect(c.checklists[0]!.items[0]!.done).toBe(true); expect(c.due).toBe("2026-02-01T17:00:00.000Z");
    expect(await S.getDoc("boards", u.id)).toBeNull(); });
});
describe("guests", () => {
  it("a guest's boards move to the account on sign-in, with ids rewritten", async () => {
    const g = await D.loadMe(guest); const ws = g.workspaces[0]!; const b = await D.createBoard(guest, { title: "Guest plans", workspaceId: ws.id });
    await D.applyActions(guest, b.id, [{ t: "card.add", listId: b.lists[0]!.id, cardId: "cguest0001", title: "mine", index: 0 }, { t: "card.member", cardId: "cguest0001", userId: guest.id, on: true }]);
    const acct: SU = { id: "unew000001", name: "New Person", email: "new@example.com", demo: false, guest: false };
    await D.adoptGuest(guest.id, acct); const me = await D.loadMe(acct);
    expect(me.boards.map(x => x.title).sort()).toEqual(["Guest plans", "My first board"]); expect(me.workspaces[0]!.name).toBe("New's Workspace");
    const nb = (await D.getBoard(b.id))!; expect(nb.members[0]!.id).toBe(acct.id); expect(nb.members[0]!.name).toBe("New Person"); expect(nb.lists[0]!.cards[0]!.members).toEqual([acct.id]);
    expect(await S.getDoc("user", guest.id)).toBeNull(); });
});
describe("collaboration", () => {
  let boardId = "";
  beforeAll(async () => { await D.loadMe(sam); const me = await D.loadMe(ada); boardId = (await D.createBoard(ada, { title: "Shared", workspaceId: me.workspaces[0]!.id, visibility: "private" })).id; });
  it("invites an existing account straight onto a board and notifies them", async () => {
    const r = await D.inviteToBoard(ada, boardId, "SAM@example.com", "normal"); expect(r.added).toBe(true);
    const me = await D.loadMe(sam); expect(me.boards.some(b => b.id === boardId)).toBe(true); expect(me.user.notifications[0]!.kind).toBe("added"); });
  it("keeps invites for unknown emails until that person signs up", async () => {
    expect((await D.inviteToBoard(ada, boardId, "later@example.com", "observer")).added).toBe(false);
    const later: SU = { id: "ulater0001", name: "Later", email: "later@example.com", demo: false, guest: false }; const me = await D.loadMe(later); expect(me.invites).toHaveLength(1);
    await D.answerInvite(later, "board", boardId, true); const b = (await D.getBoard(boardId))!; expect(b.members.find(m => m.id === later.id)!.role).toBe("observer"); });
  it("applies concurrent edits from two people without losing either", async () => {
    const b = (await D.getBoard(boardId))!; const l = b.lists[0]!.id;
    await Promise.all([D.applyActions(ada, boardId, [{ t: "card.add", listId: l, cardId: "cada000001", title: "from ada", index: 0 }]), D.applyActions(sam, boardId, [{ t: "card.add", listId: l, cardId: "csam000001", title: "from sam", index: 0 }])]);
    const after = (await D.getBoard(boardId))!; expect(after.lists[0]!.cards.map(c => c.title).sort()).toEqual(["from ada", "from sam"]); });
  it("notifies on assignment, mention and comments on watched cards", async () => {
    await D.applyActions(ada, boardId, [{ t: "card.member", cardId: "csam000001", userId: sam.id, on: true }, { t: "comment.add", cardId: "cada000001", commentId: "mcmt000001", text: "hey @sam can you check?" }]);
    const n = (await D.loadMe(sam)).user.notifications.map(x => x.kind); expect(n).toContain("assigned"); expect(n).toContain("mention");
    await D.applyActions(sam, boardId, [{ t: "card.watch", cardId: "cada000001", on: true }]); await D.applyActions(ada, boardId, [{ t: "comment.add", cardId: "cada000001", commentId: "mcmt000002", text: "update" }]);
    expect((await D.loadMe(sam)).user.notifications[0]!.kind).toBe("comment"); });
  it("schedules due reminders for card members and fires them when due", async () => {
    const soon = new Date(Date.now() + 30 * 6e4).toISOString();
    await D.applyActions(ada, boardId, [{ t: "card.patch", cardId: "csam000001", patch: { due: soon, reminder: 60 } }]);
    const me = await D.loadMe(sam); expect(me.user.notifications[0]!.kind).toBe("due"); expect(me.user.notifications[0]!.text).toContain("1 hour before"); });
  it("rejects edits from non-members and server-only actions", async () => {
    const out: SU = { id: "uout000001", name: "Out", email: "out@example.com", demo: false, guest: false }; await D.loadMe(out);
    await expect(D.applyActions(out, boardId, [{ t: "board.patch", patch: { title: "x" } }])).rejects.toThrow();
    await D.applyActions(sam, boardId, [{ t: "member.add", person: { id: sam.id, name: "Sam", username: "sam", email: "", initials: "S", color: "#000" }, role: "admin" }]);
    expect((await D.getBoard(boardId))!.members.find(m => m.id === sam.id)!.role).toBe("normal"); });
  it("searches cards with operators", async () => { const r = await D.search(sam, "@me board:shared"); expect(r.cards.map(c => c.title)).toEqual(["from sam"]); const r2 = await D.search(ada, "update"); expect(r2.cards.map(c => c.title)).toEqual(["from ada"]); });
  it("moves a card to another board", async () => {
    const me = await D.loadMe(ada); const other = await D.createBoard(ada, { title: "Other", workspaceId: me.workspaces[0]!.id });
    const r = await D.transfer(ada, { kind: "card", copy: false, fromBoard: boardId, itemId: "cada000001", toBoard: other.id, toList: other.lists[1]!.id, index: 0 });
    expect((await D.getBoard(other.id))!.lists[1]!.cards[0]!.title).toBe("from ada"); expect((await D.getBoard(boardId))!.lists[0]!.cards.some(c => c.id === "cada000001")).toBe(false); expect(r.boardId).toBe(other.id); });
});
