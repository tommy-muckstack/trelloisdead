import { describe, it, expect } from "vitest";
import { applyAction, normalizeAction, allowed, inverse, sortCards, type Action, type ActionBody } from "@/lib/actions";
import { mkBoard, mkList, mkCard, findCard, progress, type Board, type Person } from "@/lib/model";
import { matches, EMPTY_FILTER, keywordMatch } from "@/lib/filter";
import { renderMarkdown, mentionsIn } from "@/lib/markdown";
import { TEMPLATES, buildFromTemplate, copyBoard } from "@/lib/templates";

const me: Person = { id: "u_me", name: "Ada Lovelace", username: "ada", email: "ada@example.com", initials: "AL", color: "#000" };
const bob: Person = { id: "u_bob", name: "Bob", username: "bob", email: "bob@example.com", initials: "B", color: "#111" };
let k = 0;
const act = (b: Board, body: ActionBody, by = me): Board => applyAction(b, { ...body, id: "act" + k++, at: "2026-10-16T12:00:00.000Z", by: by.id, byName: by.name } as Action);
const base = () => { const at = "2026-10-01T00:00:00.000Z"; const b = mkBoard({ id: "bd1", title: "T", workspaceId: "ws1", owner: me, at });
  b.lists = [mkList("l_a", "A", [mkCard("c_a1", 1, "a1", at), mkCard("c_a2", 2, "a2", at), mkCard("c_a3", 3, "a3", at)]), mkList("l_b", "B", [mkCard("c_b1", 4, "b1", at)]), mkList("l_c", "C")]; b.seq = 4; return b; };
const titles = (b: Board, i: number) => b.lists[i]!.cards.map(c => c.title);

describe("cards", () => {
  it("adds with sequence numbers and logs activity", () => { const b = act(base(), { t: "card.add", listId: "l_c", cardId: "c_new", title: "  new  ", index: 9 }); expect(titles(b, 2)).toEqual(["new"]); expect(findCard(b, "c_new")!.card.num).toBe(5); expect(b.activity[0]!.ctext).toBe("added this card to C"); });
  it("ignores blank titles and duplicate ids", () => { const b = base(); expect(act(b, { t: "card.add", listId: "l_c", cardId: "c_x", title: "  ", index: 0 })).toBe(b); expect(act(b, { t: "card.add", listId: "l_c", cardId: "c_a1", title: "dup", index: 0 })).toBe(b); });
  it("moves within and across lists, clamping the index", () => { let b = act(base(), { t: "card.move", cardId: "c_a1", listId: "l_a", index: 2 }); expect(titles(b, 0)).toEqual(["a2", "a3", "a1"]);
    b = act(base(), { t: "card.move", cardId: "c_a2", listId: "l_b", index: 0 }); expect(titles(b, 0)).toEqual(["a1", "a3"]); expect(titles(b, 1)).toEqual(["a2", "b1"]); expect(b.activity[0]!.text).toContain("from A to B");
    expect(titles(act(base(), { t: "card.move", cardId: "c_a1", listId: "l_c", index: 99 }), 2)).toEqual(["a1"]); });
  it("never loses or duplicates a card", () => { let b = base(); const ids = () => b.lists.flatMap(l => l.cards.map(c => c.id)).sort(); const before = ids();
    for (let i = 0; i < 50; i++) { const all = b.lists.flatMap(l => l.cards); b = act(b, { t: "card.move", cardId: all[i % all.length]!.id, listId: ["l_a", "l_b", "l_c"][i % 3]!, index: i % 4 }); } expect(ids()).toEqual(before); });
  it("copies with fresh nested ids and chosen parts", () => { let b = act(base(), { t: "checklist.add", cardId: "c_a1", checklistId: "k1", title: "Todo" }); b = act(b, { t: "item.add", cardId: "c_a1", checklistId: "k1", itemId: "i1", text: "x" });
    b = act(b, { t: "card.copy", cardId: "c_a1", newId: "c_cp", listId: "l_a", index: 1, title: "a1 copy", keep: { labels: false, members: false, checklists: true, attachments: false, comments: false, dates: false } });
    const c = findCard(b, "c_cp")!.card; expect(titles(b, 0)).toEqual(["a1", "a1 copy", "a2", "a3"]); expect(c.checklists[0]!.id).not.toBe("k1"); expect(c.checklists[0]!.items[0]!.text).toBe("x"); });
  it("tracks multiple named checklists", () => { let b = act(base(), { t: "checklist.add", cardId: "c_a1", checklistId: "k1", title: "One" }); b = act(b, { t: "checklist.add", cardId: "c_a1", checklistId: "k2", title: "Two" });
    b = act(b, { t: "item.add", cardId: "c_a1", checklistId: "k1", itemId: "i1", text: "a" }); b = act(b, { t: "item.add", cardId: "c_a1", checklistId: "k2", itemId: "i2", text: "b" }); b = act(b, { t: "item.patch", cardId: "c_a1", checklistId: "k2", itemId: "i2", done: true });
    expect(progress(findCard(b, "c_a1")!.card)).toEqual({ done: 1, total: 2 }); expect(findCard(b, "c_a1")!.card.checklists.map(c => c.title)).toEqual(["One", "Two"]); });
  it("only lets the author edit a comment", () => { let b = act(base(), { t: "member.add", person: bob, role: "normal" }); b = act(b, { t: "comment.add", cardId: "c_a1", commentId: "m1", text: "hi" });
    expect(act(b, { t: "comment.edit", cardId: "c_a1", commentId: "m1", text: "hacked" }, bob)).toBe(b); expect(findCard(act(b, { t: "comment.edit", cardId: "c_a1", commentId: "m1", text: "hello" }), "c_a1")!.card.comments[0]!.text).toBe("hello"); });
});
describe("lists", () => {
  it("copies, sorts, archives all and moves all cards", () => { let b = act(base(), { t: "list.copy", listId: "l_a", newId: "l_a2", title: "A copy" }); expect(b.lists.map(l => l.title)).toEqual(["A", "A copy", "B", "C"]); expect(b.lists[1]!.cards).toHaveLength(3);
    b = act(b, { t: "list.sort", listId: "l_a", sortBy: "title" }); expect(titles(b, 0)).toEqual(["a1", "a2", "a3"]);
    b = act(b, { t: "list.moveCards", listId: "l_a", toListId: "l_c" }); expect(titles(b, 3)).toEqual(["a1", "a2", "a3"]); expect(titles(b, 0)).toEqual([]);
    b = act(b, { t: "list.archiveCards", listId: "l_c" }); expect(b.lists[3]!.cards.every(c => c.archived)).toBe(true); });
  it("reorders lists", () => { expect(act(base(), { t: "list.move", listId: "l_c", index: 0 }).lists.map(l => l.title)).toEqual(["C", "A", "B"]); });
});
describe("automation", () => {
  it("runs a rule once when a card moves into a list", () => { let b = base(); const done = b.labels[0]!.id;
    b = act(b, { t: "rule.save", rule: { id: "r1", name: "", enabled: true, trigger: { kind: "card.moved", listId: "l_c", labelId: null }, steps: [{ t: "complete", on: true }, { t: "label", labelId: done, on: true }, { t: "move", listId: "l_c", pos: "top" }] } });
    b = act(b, { t: "card.move", cardId: "c_b1", listId: "l_c", index: 0 }); const c = findCard(b, "c_b1")!.card; expect(c.dueComplete).toBe(true); expect(c.labels).toEqual([done]); expect(b.activity.some(a => a.text.startsWith("Automation:"))).toBe(true); });
  it("fires on checklist completion and card add", () => { let b = base();
    b = act(b, { t: "rule.save", rule: { id: "r1", name: "", enabled: true, trigger: { kind: "checklist.done", listId: null, labelId: null }, steps: [{ t: "move", listId: "l_c", pos: "bottom" }] } });
    b = act(b, { t: "rule.save", rule: { id: "r2", name: "", enabled: true, trigger: { kind: "card.added", listId: "l_a", labelId: null }, steps: [{ t: "join" }] } });
    b = act(b, { t: "card.add", listId: "l_a", cardId: "c_n", title: "n", index: 0 }); expect(findCard(b, "c_n")!.card.members).toEqual([me.id]);
    b = act(b, { t: "checklist.add", cardId: "c_n", checklistId: "k", title: "c" }); b = act(b, { t: "item.add", cardId: "c_n", checklistId: "k", itemId: "i", text: "x" }); b = act(b, { t: "item.patch", cardId: "c_n", checklistId: "k", itemId: "i", done: true });
    expect(findCard(b, "c_n")!.list.id).toBe("l_c"); });
  it("disabled rules do nothing; buttons run their steps", () => { let b = act(base(), { t: "rule.save", rule: { id: "r", name: "", enabled: false, trigger: { kind: "card.moved", listId: null, labelId: null }, steps: [{ t: "archive" }] } });
    b = act(b, { t: "card.move", cardId: "c_a1", listId: "l_b", index: 0 }); expect(findCard(b, "c_a1")!.card.archived).toBe(false);
    b = act(b, { t: "button.save", button: { id: "btn", name: "Ship it", scope: "card", steps: [{ t: "move", listId: "l_c", pos: "top" }, { t: "complete", on: true }] } });
    b = act(b, { t: "button.run", buttonId: "btn", cardId: "c_a1" }); expect(findCard(b, "c_a1")!.list.id).toBe("l_c"); expect(findCard(b, "c_a1")!.card.dueComplete).toBe(true); });
});
describe("permissions and validation", () => {
  it("blocks non-members and observers; admins only for visibility", () => { let b = base(); const a = (body: ActionBody, by: Person) => ({ ...body, id: "x", at: "", by: by.id, byName: by.name } as Action);
    expect(allowed(b, a({ t: "card.add", listId: "l_a", cardId: "c9", title: "x", index: 0 }, bob))).toBe(false);
    b = act(b, { t: "member.add", person: bob, role: "observer" }); expect(allowed(b, a({ t: "card.add", listId: "l_a", cardId: "c9", title: "x", index: 0 }, bob))).toBe(false); expect(allowed(b, a({ t: "card.watch", cardId: "c_a1", on: true }, bob))).toBe(true);
    b = act(b, { t: "member.role", userId: bob.id, role: "normal" }); expect(allowed(b, a({ t: "board.patch", patch: { visibility: "public" } }, bob))).toBe(false); expect(allowed(b, a({ t: "board.patch", patch: { title: "x" } }, bob))).toBe(true); });
  it("keeps at least one admin", () => { const b = base(); expect(act(b, { t: "member.role", userId: me.id, role: "normal" })).toBe(b); expect(act(b, { t: "member.remove", userId: me.id })).toBe(b); });
  it("action bodies never use the stamped field names", () => { for (const t of ["list.sort"]) expect(JSON.stringify(normalizeAction({ t, listId: "l_aa", sortBy: "title" }))).not.toContain('"by"'); });
  it("normalizes untrusted input", () => { expect(normalizeAction(null)).toBeNull(); expect(normalizeAction({ t: "card.add", listId: "../x", cardId: "c1", title: "t" })).toBeNull(); expect(normalizeAction({ t: "nope" })).toBeNull();
    expect(normalizeAction({ t: "attachment.add", cardId: "c1", attachment: { id: "att1", kind: "link", url: "javascript:alert(1)" } })).toBeNull();
    expect(normalizeAction({ t: "card.patch", cardId: "c_1", patch: { due: "garbage", title: "x".repeat(9999), evil: 1 } })).toEqual({ t: "card.patch", cardId: "c_1", patch: { title: "x".repeat(512) } });
    expect(normalizeAction({ t: "label.create", labelId: "lb1", name: "Bug", color: "hotpink" })).toBeNull(); });
});
describe("undo", () => {
  it("inverts moves and patches", () => { const b0 = base(); const a = { t: "card.move", cardId: "c_a1", listId: "l_b", index: 1, id: "z", at: "", by: me.id, byName: "" } as Action;
    const b1 = applyAction(b0, a); const inv = inverse(b0, a, "u")!; expect(titles(act(b1, inv), 0)).toEqual(["a1", "a2", "a3"]);
    const p = { t: "card.patch", cardId: "c_a1", patch: { title: "renamed" }, id: "y", at: "", by: me.id, byName: "" } as Action; expect(findCard(act(applyAction(b0, p), inverse(b0, p, "u")!), "c_a1")!.card.title).toBe("a1"); });
});
describe("filter", () => {
  const at = new Date("2026-10-16T12:00:00Z").getTime();
  const c = { ...mkCard("c", 1, "Fix login bug", "2026-10-16T00:00:00Z"), desc: "OAuth", labels: ["red"], members: ["u_me"], due: "2026-10-16T20:00:00Z", updatedAt: "2026-10-15T00:00:00Z" };
  it("matches keywords, phrases and *", () => { expect(keywordMatch(c, null, "oauth")).toBe(true); expect(keywordMatch(c, null, '"login bug"')).toBe(true); expect(keywordMatch(c, null, '"bug login"')).toBe(false); expect(keywordMatch(c, null, "*")).toBe(true); });
  it("matches members, due and labels with any/exact", () => { const ctx = { me: "u_me", at };
    expect(matches(c, { ...EMPTY_FILTER, members: ["me"] }, ctx)).toBe(true); expect(matches(c, { ...EMPTY_FILTER, members: ["none"] }, ctx)).toBe(false);
    expect(matches(c, { ...EMPTY_FILTER, due: ["day"] }, ctx)).toBe(true); expect(matches(c, { ...EMPTY_FILTER, due: ["overdue"] }, ctx)).toBe(false);
    expect(matches(c, { ...EMPTY_FILTER, labels: ["red", "blue"] }, ctx)).toBe(true); expect(matches(c, { ...EMPTY_FILTER, labels: ["red", "blue"], exact: true }, ctx)).toBe(false);
    expect(matches(c, { ...EMPTY_FILTER, activity: ["week"] }, ctx)).toBe(true); expect(matches(c, { ...EMPTY_FILTER, status: ["complete"] }, ctx)).toBe(false); });
});
describe("markdown", () => {
  it("escapes HTML and renders a safe subset", () => { const h = renderMarkdown('<img src=x onerror=alert(1)> **bold** [x](javascript:alert(1)) [ok](https://a.b/c) @ada', ["ada"]);
    expect(h).not.toContain("<img"); expect(h).toContain("&lt;img"); expect(h).toContain("<strong>bold</strong>"); expect(h).not.toContain('href="javascript'); expect(h).toContain('href="https://a.b/c"'); expect(h).toContain('md-mention'); });
  it("renders lists, tasks and code", () => { const h = renderMarkdown("- one\n- [x] two\n\n```\n<b>\n```"); expect(h).toContain("<ul><li>one</li>"); expect(h).toContain("checked"); expect(h).toContain("<pre><code>&lt;b&gt;</code></pre>"); });
  it("finds mentions", () => { expect(mentionsIn("hey @Ada and @bob_2, email a@b.c")).toEqual(["ada", "bob_2"]); });
});
describe("templates", () => {
  it("every template builds a valid board with unique ids", () => { for (const t of TEMPLATES) { const b = buildFromTemplate(t, { id: "b" + t.id.replace(/-/g, ""), workspaceId: "w", owner: me }); const ids = [b.id, ...b.lists.map(l => l.id), ...b.lists.flatMap(l => l.cards.flatMap(c => [c.id, ...c.checklists.flatMap(k => [k.id, ...k.items.map(i => i.id)])]))]; expect(new Set(ids).size).toBe(ids.length); expect(b.lists.length).toBeGreaterThan(2); expect(b.lists.flatMap(l => l.cards).every(c => c.labels.every(x => b.labels.some(l => l.id === x)))).toBe(true); } });
  it("copies a board with remapped labels", () => { let b = base(); b = act(b, { t: "card.label", cardId: "c_a1", labelId: b.labels[2]!.id, on: true }); const c = copyBoard(b, { id: "bnew", title: "Copy", workspaceId: "w", owner: bob, keepCards: true }); expect(c.members.map(m => m.id)).toEqual([bob.id]); expect(c.lists[0]!.cards[0]!.labels).toEqual([c.labels[2]!.id]); });
  it("sorts by due date with undated last", () => { const at = "2026-01-01T00:00:00Z"; const s = sortCards([mkCard("a", 1, "a", at), mkCard("b", 2, "b", at, { due: "2026-02-01T00:00:00Z" })], "due"); expect(s.map(x => x.id)).toEqual(["b", "a"]); });
});
