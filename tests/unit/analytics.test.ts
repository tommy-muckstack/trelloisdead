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
import { scrub } from "@/lib/analytics/posthog";
describe("analytics privacy", () => {
  it("strips query strings, hashes and titles", () => {
    const e = scrub({ event: "$pageview", properties: { $current_url: "https://yourappisdead.com/x/app?url=https://secret.example#frag", $referrer: "https://google.com/search?q=me", title: "My private doc" } });
    expect(e.properties.$current_url).toBe("https://yourappisdead.com/x/app"); expect(e.properties.$referrer).toBe("https://google.com/search"); expect("title" in e.properties).toBe(false);
  });
  it("masks join tokens, board and workspace ids", () => {
    const e = scrub({ event: "$pageview", properties: { $current_url: "https://yourappisdead.com/trelloisdead/app/join/tok_SECRET123", $pathname: "/trelloisdead/app/b/b_abc/settings?card=c_1", $referrer: "https://yourappisdead.com/trelloisdead/app/w/w_9/members" }, $set: { $current_url: "https://yourappisdead.com/trelloisdead/app/join/tok_SECRET123" } });
    expect(e.properties.$current_url).toBe("https://yourappisdead.com/trelloisdead/app/join/:id"); expect(e.properties.$pathname).toBe("/trelloisdead/app/b/:id/settings");
    expect(e.properties.$referrer).toBe("https://yourappisdead.com/trelloisdead/app/w/:id/members"); expect(e.$set.$current_url).not.toContain("SECRET");
  });
  it("cleans every URL-like key, including session entry and $set / $set_once", () => {
    const u = "https://yourappisdead.com/trelloisdead/app/join/tok_S?ref=x#y";
    const e = scrub({ event: "$pageview", properties: { $session_entry_url: u, $session_entry_referrer: u, $session_entry_pathname: "/trelloisdead/app?q=1", custom_url: u, $set: { $initial_current_url: u }, $set_once: { $initial_referrer: u } }, $set: { $current_url: u }, $set_once: { $initial_pathname: "/a?b" } });
    const all = JSON.stringify(e); expect(all).not.toMatch(/[?#]/); expect(all).not.toContain("tok_S");
    expect(e.properties.$session_entry_url).toBe("https://yourappisdead.com/trelloisdead/app/join/:id");
  });
});
