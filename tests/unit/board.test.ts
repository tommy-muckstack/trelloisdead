import { describe, it, expect } from "vitest";
import * as B from "@/lib/board";
const base = () => { const s: B.State = { boards: [B.mkBoard("T", "ocean", [B.mkList("A", [B.mkCard("a1"), B.mkCard("a2"), B.mkCard("a3")]), B.mkList("B", [B.mkCard("b1")]), B.mkList("C")])] }; return { s, b: s.boards[0]!, id: s.boards[0]!.id }; };
const titles = (s: B.State, li: number) => s.boards[0]!.lists[li]!.cards.map(c => c.title);
describe("cards", () => {
  it("adds trimmed cards and ignores blanks", () => { const { s, id, b } = base(); const x = B.addCard(B.addCard(s, id, b.lists[2]!.id, "  new  "), id, b.lists[2]!.id, "   "); expect(titles(x, 2)).toEqual(["new"]); });
  it("moves within a list", () => { const { s, id, b } = base(); expect(titles(B.moveCard(s, id, b.lists[0]!.cards[0]!.id, b.lists[0]!.id, 2), 0)).toEqual(["a2", "a3", "a1"]); });
  it("moves across lists at an index and clamps", () => { const { s, id, b } = base(); const x = B.moveCard(s, id, b.lists[0]!.cards[1]!.id, b.lists[1]!.id, 0); expect(titles(x, 0)).toEqual(["a1", "a3"]); expect(titles(x, 1)).toEqual(["a2", "b1"]); expect(titles(B.moveCard(s, id, b.lists[0]!.cards[0]!.id, b.lists[2]!.id, 99), 2)).toEqual(["a1"]); });
  it("never loses or duplicates a card on any move", () => { const { s, id, b } = base(); const all = (st: B.State) => st.boards[0]!.lists.flatMap(l => l.cards.map(c => c.id)).sort(); let x = s; for (let i = 0; i < 40; i++) { const cards = x.boards[0]!.lists.flatMap(l => l.cards); x = B.moveCard(x, id, cards[i % cards.length]!.id, b.lists[i % 3]!.id, i % 4); } expect(all(x)).toEqual(all(s)); });
  it("ignores moves to unknown lists/cards", () => { const { s, id, b } = base(); expect(B.moveCard(s, id, b.lists[0]!.cards[0]!.id, "nope", 0)).toEqual(s); expect(B.moveCard(s, id, "nope", b.lists[0]!.id, 0)).toEqual(s); });
  it("copies right after the original with fresh ids", () => { const { s, id, b } = base(); const x = B.copyCard(s, id, b.lists[0]!.cards[0]!.id); expect(titles(x, 0)).toEqual(["a1", "a1 (copy)", "a2", "a3"]); expect(new Set(x.boards[0]!.lists.flatMap(l => l.cards.map(c => c.id))).size).toBe(5); });
  it("patches and deletes", () => { const { s, id, b } = base(); const cid = b.lists[1]!.cards[0]!.id; const x = B.patchCard(s, id, cid, { title: " renamed ", labels: ["red"], due: "2026-01-02" }); const hit = B.findCard(x.boards[0]!, cid)!; expect(hit.card.title).toBe("renamed"); expect(hit.card.labels).toEqual(["red"]); expect(B.findCard(B.deleteCard(x, id, cid).boards[0]!, cid)).toBeNull(); expect(B.patchCard(s, id, cid, { title: "  " }).boards[0]!.lists[1]!.cards[0]!.title).toBe("b1"); });
});
describe("lists and boards", () => {
  it("reorders lists", () => { const { s, id, b } = base(); expect(B.moveList(s, id, b.lists[2]!.id, 0).boards[0]!.lists.map(l => l.title)).toEqual(["C", "A", "B"]); });
  it("renames, archives lists", () => { const { s, id, b } = base(); const x = B.setListArchived(B.renameList(s, id, b.lists[0]!.id, "Z"), id, b.lists[0]!.id, true); expect(x.boards[0]!.lists[0]).toMatchObject({ title: "Z", archived: true }); });
  it("creates, patches and deletes boards", () => { const { s, id } = base(); const x = B.addBoard(s, B.mkBoard("N", "grape")); expect(x.boards).toHaveLength(2); expect(x.boards[0]!.title).toBe("N"); expect(B.patchBoard(x, id, { bg: "rose", title: "" }).boards[1]).toMatchObject({ bg: "rose", title: "T" }); expect(B.deleteBoard(x, id).boards).toHaveLength(1); });
});
describe("checklist and due dates", () => {
  it("tracks progress", () => { const { s, id, b } = base(); const cid = b.lists[0]!.cards[0]!.id; let x = B.addCheckItem(B.addCheckItem(s, id, cid, "one"), id, cid, "two"); const c = B.findCard(x.boards[0]!, cid)!.card; expect(B.checklistProgress(c)).toEqual({ done: 0, total: 2 }); x = B.patchCard(x, id, cid, { checklist: c.checklist.map((i, k) => ({ ...i, done: k === 0 })) }); expect(B.checklistProgress(B.findCard(x.boards[0]!, cid)!.card)).toEqual({ done: 1, total: 2 }); });
  it("classifies due dates", () => { const at = new Date("2026-10-14T12:00:00"); const c = (due: string | null, done = false): B.Card => ({ ...B.mkCard("x"), due, checklist: done ? [{ id: "1", text: "t", done: true }] : [] });
    expect(B.dueStatus(c(null), at)).toBe("none"); expect(B.dueStatus(c("2026-10-13"), at)).toBe("overdue"); expect(B.dueStatus(c("2026-10-14"), at)).toBe("soon"); expect(B.dueStatus(c("2026-10-20"), at)).toBe("later"); expect(B.dueStatus(c("2026-10-01", true), at)).toBe("done"); });
  it("filters by text and label", () => { const c = { ...B.mkCard("Fix login"), desc: "OAuth bug", labels: ["red" as const] }; expect(B.matches(c, { q: "oauth", label: null })).toBe(true); expect(B.matches(c, { q: "", label: "blue" })).toBe(false); expect(B.matches(c, { q: "zzz", label: null })).toBe(false); });
});
describe("sanitizeState", () => {
  it("rejects junk and cleans fields", () => { expect(B.sanitizeState(null)).toBeNull(); expect(B.sanitizeState({ boards: "x" })).toBeNull();
    const out = B.sanitizeState({ boards: [{ id: "dup", title: "", bg: "nope", lists: [{ id: "dup", title: "L", cards: [{ id: "c1", title: "t", labels: ["red", "pink"], due: "tomorrow", checklist: [{ text: "x", done: 1 }] }] }] }] })!;
    expect(out.boards[0]!.bg).toBe("ocean"); expect(out.boards[0]!.title).toBe("Untitled board"); expect(out.boards[0]!.lists[0]!.id).not.toBe("dup"); const c = out.boards[0]!.lists[0]!.cards[0]!; expect(c.labels).toEqual(["red"]); expect(c.due).toBeNull(); expect(c.checklist[0]).toMatchObject({ text: "x", done: true }); });
  it("round-trips the demo state", () => { const d = B.demoState(); expect(B.sanitizeState(d)).toEqual(d); });
});
