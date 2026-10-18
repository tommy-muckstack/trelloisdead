import { describe, it, expect } from "vitest";
import { EVENTS, EVENT_PREFIXES, APP, superProps } from "@/lib/analytics/taxonomy";
describe("analytics taxonomy", () => {
  it("uses the shared prefixes and snake_case", () => { for (const e of Object.values(EVENTS)) { expect(e, e).toMatch(/^[a-z]+(_[a-z]+)+$/); expect(EVENT_PREFIXES.some(p => e.startsWith(p)), e).toBe(true); } });
  it("never puts the product name in an event name", () => { for (const e of Object.values(EVENTS)) expect(e.includes(APP.replace(/isdead$/, ""))).toBe(false); });
  it("sends the hub's super properties", () => { expect(superProps("app")).toEqual({ product: APP, surface: "app", platform: "web" }); });
});
import { actionEvent } from "@/lib/analytics/boardEvents";
import type { Board } from "@/lib/model";
describe("board action events", () => {
  const board = { lists: [{ id: "l1", cards: [{ id: "c1" }] }, { id: "l2", cards: [] }] } as unknown as Board;
  it("maps actions to taxonomy events without content", () => {
    expect(actionEvent({ t: "card.add", listId: "l1", cardId: "c2", title: "secret", index: 0 }, board)).toEqual(["app_card_created", { origin: "add" }]);
    expect(actionEvent({ t: "comment.add", cardId: "c1", commentId: "m1", text: "secret" }, board)).toEqual(["app_comment_added", {}]);
  });
  it("counts a move only when the card changes list", () => {
    expect(actionEvent({ t: "card.move", cardId: "c1", listId: "l1", index: 0 }, board)).toBeNull();
    expect(actionEvent({ t: "card.move", cardId: "c1", listId: "l2", index: 0 }, board)?.[0]).toBe("app_card_moved");
  });
});
