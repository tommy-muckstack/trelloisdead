// TrelloIsDead data model: one document per board (lists, cards, labels, members, rules, activity),
// one per workspace and one per user. Board edits travel as Actions (lib/actions.ts) that the client
// applies optimistically and the server re-applies to the stored board, so collaborators never
// overwrite each other's work. Everything in this file is pure and shared by client and server.
import photos from "./photos.json";
import { BP } from "./basepath";

export type Role = "admin" | "normal" | "observer";
export type Visibility = "private" | "workspace" | "public";
export type Person = { id: string; name: string; username: string; email: string; initials: string; color: string; avatar?: string | null };
export type BoardMember = Person & { role: Role };
export type Label = { id: string; name: string; color: string };
export type CheckItem = { id: string; text: string; done: boolean; due: string | null; member: string | null };
export type Checklist = { id: string; title: string; items: CheckItem[] };
export type Attachment = { id: string; name: string; url: string; kind: "file" | "link"; mime: string; size: number; by: string; at: string };
export type Comment = { id: string; by: string; byName: string; text: string; at: string; edited: string | null };
export type Cover = { color: string | null; attachmentId: string | null; size: "normal" | "full" };
export type Place = { name: string; address: string; lat: number; lng: number };
export type FieldType = "text" | "number" | "date" | "checkbox" | "list";
export type FieldOption = { id: string; name: string; color: string };
export type CustomField = { id: string; name: string; type: FieldType; options: FieldOption[]; front: boolean };
export type FieldValue = string | number | boolean | null;
export type Card = {
  id: string; num: number; title: string; desc: string; labels: string[]; members: string[];
  start: string | null; due: string | null; dueComplete: boolean; reminder: number;
  checklists: Checklist[]; attachments: Attachment[]; comments: Comment[]; cover: Cover | null; location: Place | null;
  custom: Record<string, FieldValue>; votes: string[]; watchers: string[]; archived: boolean; isTemplate: boolean; createdAt: string; updatedAt: string;
};
export type List = { id: string; title: string; archived: boolean; cards: Card[]; watchers: string[]; limit: number | null };
export type Activity = { id: string; at: string; by: string; byName: string; cardId: string | null; text: string; ctext: string };
export type TriggerKind = "card.added" | "card.moved" | "card.complete" | "checklist.done" | "label.added";
export type Trigger = { kind: TriggerKind; listId: string | null; labelId: string | null };
export type RuleStep =
  | { t: "move"; listId: string; pos: "top" | "bottom" } | { t: "label"; labelId: string; on: boolean } | { t: "complete"; on: boolean }
  | { t: "due"; days: number | null } | { t: "archive" } | { t: "join" } | { t: "clearMembers" } | { t: "checklist"; title: string }
  | { t: "sortList"; listId: string; by: SortBy } | { t: "archiveList"; listId: string } | { t: "moveAll"; from: string; to: string };
export type Rule = { id: string; name: string; enabled: boolean; trigger: Trigger; steps: RuleStep[] };
export type ButtonDef = { id: string; name: string; scope: "card" | "board"; steps: RuleStep[] };
export type SortBy = "newest" | "oldest" | "title" | "due" | "votes";
export type BoardSettings = { covers: boolean; comments: "members" | "observers" | "workspace" | "disabled"; completeOnFront: boolean };
export type Board = {
  id: string; title: string; desc: string; bg: string; workspaceId: string; visibility: Visibility; ownerId: string;
  members: BoardMember[]; labels: Label[]; lists: List[]; fields: CustomField[]; powerUps: string[]; rules: Rule[]; buttons: ButtonDef[];
  activity: Activity[]; closed: boolean; isTemplate: boolean; settings: BoardSettings; seq: number; createdAt: string; updatedAt: string; version: number;
};
/** What the boards pages need to draw a tile, without loading the whole board. */
export type BoardSummary = { id: string; title: string; bg: string; workspaceId: string; visibility: Visibility; closed: boolean; isTemplate: boolean; updatedAt: string; role: Role | null };
export type WsMember = Person & { role: "admin" | "normal" };
export type Invite = { email: string; role: "admin" | "normal"; by: string; at: string };
export type WorkspaceType = "" | "education" | "engineering" | "hr" | "marketing" | "operations" | "sales" | "small-business" | "other";
export type Workspace = { id: string; name: string; short: string; desc: string; website: string; type: WorkspaceType; ownerId: string; members: WsMember[]; invites: Invite[]; boards: string[]; inviteToken: string; visibility: "private" | "public"; createdAt: string };
export type Notification = { id: string; at: string; read: boolean; kind: "assigned" | "mention" | "comment" | "due" | "invite" | "added" | "moved"; text: string; by: string; byName: string; boardId: string | null; cardId: string | null; link: string };
export type Scheduled = { key: string; fireAt: string; text: string; boardId: string; cardId: string };
export type Theme = "light" | "dark" | "system";
export type UserSettings = { theme: Theme; shortcuts: boolean; colorBlind: boolean; desktop: boolean };
export type UserDoc = Person & { bio: string; workspaces: string[]; boards: string[]; starred: string[]; recent: { id: string; at: string }[]; settings: UserSettings; notifications: Notification[]; scheduled: Scheduled[]; guest: boolean; createdAt: string };

export const LIMITS = { boards: 500, lists: 60, cards: 1500, title: 512, desc: 16384, items: 200, checklists: 20, comments: 1000, comment: 5000, labels: 50, activity: 400, attachments: 50, fields: 30, rules: 40, notifications: 200 };

// ---- palettes ----
export const LABEL_COLORS: { id: string; name: string; hex: string; fg: string }[] = [
  ["green_light", "subtle green", "#BAF3DB", "#164B35"], ["yellow_light", "subtle yellow", "#F8E6A0", "#533F04"], ["orange_light", "subtle orange", "#FEDEC8", "#702E00"], ["red_light", "subtle red", "#FFD5D2", "#5D1F1A"], ["purple_light", "subtle purple", "#DFD8FD", "#352C63"],
  ["green", "green", "#4BCE97", "#164B35"], ["yellow", "yellow", "#F5CD47", "#533F04"], ["orange", "orange", "#FEA362", "#702E00"], ["red", "red", "#F87168", "#5D1F1A"], ["purple", "purple", "#9F8FEF", "#352C63"],
  ["green_dark", "bold green", "#1F845A", "#FFFFFF"], ["yellow_dark", "bold yellow", "#946F00", "#FFFFFF"], ["orange_dark", "bold orange", "#C25100", "#FFFFFF"], ["red_dark", "bold red", "#C9372C", "#FFFFFF"], ["purple_dark", "bold purple", "#6E5DC6", "#FFFFFF"],
  ["blue_light", "subtle blue", "#CCE0FF", "#09326C"], ["sky_light", "subtle sky", "#C6EDFB", "#164555"], ["lime_light", "subtle lime", "#D3F1A7", "#37471F"], ["pink_light", "subtle pink", "#FDD0EC", "#50253F"], ["black_light", "subtle black", "#DCDFE4", "#091E42"],
  ["blue", "blue", "#579DFF", "#09326C"], ["sky", "sky", "#6CC3E0", "#164555"], ["lime", "lime", "#94C748", "#37471F"], ["pink", "pink", "#E774BB", "#50253F"], ["black", "black", "#8590A2", "#091E42"],
  ["blue_dark", "bold blue", "#0C66E4", "#FFFFFF"], ["sky_dark", "bold sky", "#227D9B", "#FFFFFF"], ["lime_dark", "bold lime", "#5B7F24", "#FFFFFF"], ["pink_dark", "bold pink", "#AE4787", "#FFFFFF"], ["black_dark", "bold black", "#626F86", "#FFFFFF"],
].map(([id, name, hex, fg]) => ({ id: id!, name: name!, hex: hex!, fg: fg! }));
export const labelColor = (id: string) => LABEL_COLORS.find(c => c.id === id) ?? LABEL_COLORS[25]!;
export const DEFAULT_LABELS: { color: string; name: string }[] = ["green", "yellow", "orange", "red", "purple", "blue"].map(color => ({ color, name: "" }));

export const GRADIENTS = [
  { id: "ocean", name: "Ocean", css: "linear-gradient(135deg,#0C66E4,#1D9BD1)", dark: true }, { id: "grape", name: "Grape", css: "linear-gradient(135deg,#6E5DC6,#B25FC0)", dark: true },
  { id: "sunrise", name: "Sunrise", css: "linear-gradient(135deg,#E56910,#F5A623)", dark: true }, { id: "forest", name: "Forest", css: "linear-gradient(135deg,#216E4E,#4C9A5F)", dark: true },
  { id: "rose", name: "Rose", css: "linear-gradient(135deg,#C9372C,#E774BB)", dark: true }, { id: "slate", name: "Slate", css: "linear-gradient(135deg,#44546F,#626F86)", dark: true },
  { id: "aurora", name: "Aurora", css: "linear-gradient(135deg,#0B3D5C,#1F845A 60%,#94C748)", dark: true }, { id: "dusk", name: "Dusk", css: "linear-gradient(135deg,#1D2125,#6E5DC6)", dark: true },
  { id: "peach", name: "Peach", css: "linear-gradient(135deg,#F87168,#FEC195)", dark: true },
];
export const COLORS = [
  { id: "c-blue", name: "Blue", css: "#0C66E4" }, { id: "c-orange", name: "Orange", css: "#C25100" }, { id: "c-green", name: "Green", css: "#1F845A" }, { id: "c-red", name: "Red", css: "#C9372C" },
  { id: "c-purple", name: "Purple", css: "#6E5DC6" }, { id: "c-pink", name: "Pink", css: "#AE4787" }, { id: "c-lime", name: "Lime", css: "#5B7F24" }, { id: "c-sky", name: "Sky", css: "#227D9B" }, { id: "c-grey", name: "Grey", css: "#626F86" },
];
export const PHOTOS: { id: string; author: string; source: string }[] = photos;
export const photoUrl = (id: string, thumb = false) => `${BP}/bg/${id}${thumb ? "-t" : ""}.jpg`;
export const uploadUrl = (blobId: string) => `${BP}/api/files/${blobId}`;
/** CSS `background` for a board's `bg` id: gradient id, "c-<color>", "p<photo>" or "u:<blobId>" (custom upload). */
export function bgCss(bg: string, thumb = false): string {
  const g = GRADIENTS.find(x => x.id === bg); if (g) return g.css;
  const c = COLORS.find(x => x.id === bg); if (c) return c.css;
  if (PHOTOS.some(p => p.id === bg)) return `#1d2125 center/cover no-repeat url(${photoUrl(bg, thumb)})`;
  if (bg.startsWith("u:")) return `#1d2125 center/cover no-repeat url(${uploadUrl(bg.slice(2))})`;
  return GRADIENTS[0]!.css;
}
export const isBg = (bg: unknown): bg is string => typeof bg === "string" && (GRADIENTS.some(x => x.id === bg) || COLORS.some(x => x.id === bg) || PHOTOS.some(p => p.id === bg) || /^u:[A-Za-z0-9_-]{6,60}$/.test(bg));
export const photoCredit = (bg: string) => PHOTOS.find(p => p.id === bg) ?? null;

export const AVATAR_COLORS = ["#0C66E4", "#1F845A", "#C25100", "#6E5DC6", "#AE4787", "#227D9B", "#5B7F24", "#C9372C", "#44546F"];
export const initialsOf = (name: string) => (name.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? "").join("") || "?").toUpperCase();
export const colorFor = (id: string) => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return AVATAR_COLORS[h % AVATAR_COLORS.length]!; };
export const usernameFrom = (s: string) => (s.split("@")[0] ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24) || "user";

export const POWERUPS = [
  { id: "voting", name: "Voting", by: "TrelloIsDead", cat: "Board utilities", desc: "Let board members vote on cards. Vote counts show on the front of each card, and lists can be sorted by votes." },
  { id: "aging", name: "Card Aging", by: "TrelloIsDead", cat: "Board utilities", desc: "Cards that haven't been touched in a while slowly fade, so stale work stands out. Fades after 7, 14 and 28 days." },
  { id: "limits", name: "List Limits", by: "TrelloIsDead", cat: "Analytics & reporting", desc: "Set a work-in-progress limit on any list. The list turns red when it has more cards than its limit." },
  { id: "fields", name: "Custom Fields", by: "TrelloIsDead", cat: "Board utilities", desc: "Add text, number, date, checkbox and dropdown fields to cards. Choose which fields show on the front of the card." },
  { id: "numbers", name: "Card Numbers", by: "TrelloIsDead", cat: "Developer tools", desc: "Show each card's number (#12) on the front of the card, so you can refer to it in comments and chats." },
] as const;
export type PowerUpId = (typeof POWERUPS)[number]["id"];

export const REMINDERS: { v: number; label: string }[] = [
  { v: -1, label: "None" }, { v: 0, label: "At time of due date" }, { v: 5, label: "5 Minutes before" }, { v: 10, label: "10 Minutes before" }, { v: 15, label: "15 Minutes before" },
  { v: 60, label: "1 Hour before" }, { v: 120, label: "2 Hours before" }, { v: 1440, label: "1 Day before" }, { v: 2880, label: "2 Days before" },
];

// ---- ids and time ----
let n = 0;
export const uid = (p = "") => p + Date.now().toString(36) + (n++ % 1296).toString(36).padStart(2, "0") + Math.random().toString(36).slice(2, 6);
export const isId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{3,60}$/.test(v);
export const now = () => new Date().toISOString();
export const clip = (s: unknown, max: number) => (typeof s === "string" ? s.slice(0, max) : "");

// ---- factories ----
export const mkCard = (id: string, num: number, title: string, at: string, o: Partial<Card> = {}): Card => ({
  id, num, title: title.trim().slice(0, LIMITS.title), desc: "", labels: [], members: [], start: null, due: null, dueComplete: false, reminder: -1,
  checklists: [], attachments: [], comments: [], cover: null, location: null, custom: {}, votes: [], watchers: [], archived: false, isTemplate: false, createdAt: at, updatedAt: at, ...o,
});
export const mkList = (id: string, title: string, cards: Card[] = []): List => ({ id, title: title.trim().slice(0, LIMITS.title) || "Untitled list", archived: false, cards, watchers: [], limit: null });
export const mkLabels = (seed: string, defs: { color: string; name: string }[] = DEFAULT_LABELS): Label[] => defs.map((d, i) => ({ id: `${seed}L${i}`, name: d.name, color: d.color }));
export function mkBoard(o: { id: string; title: string; bg?: string; workspaceId: string; owner: Person; visibility?: Visibility; at?: string }): Board {
  const at = o.at ?? now();
  return { id: o.id, title: o.title.trim().slice(0, LIMITS.title) || "Untitled board", desc: "", bg: o.bg && isBg(o.bg) ? o.bg : "ocean", workspaceId: o.workspaceId, visibility: o.visibility ?? "workspace", ownerId: o.owner.id,
    members: [{ ...o.owner, role: "admin" }], labels: mkLabels(o.id), lists: [], fields: [], powerUps: [], rules: [], buttons: [], activity: [], closed: false, isTemplate: false,
    settings: { covers: true, comments: "members", completeOnFront: true }, seq: 0, createdAt: at, updatedAt: at, version: 0 };
}
export const summary = (b: Board, userId: string | null): BoardSummary => ({ id: b.id, title: b.title, bg: b.bg, workspaceId: b.workspaceId, visibility: b.visibility, closed: b.closed, isTemplate: b.isTemplate, updatedAt: b.updatedAt, role: b.members.find(m => m.id === userId)?.role ?? null });

// ---- lookups ----
export const findCard = (b: Board, cardId: string): { list: List; card: Card; index: number } | null => {
  for (const l of b.lists) { const i = l.cards.findIndex(c => c.id === cardId); if (i >= 0) return { list: l, card: l.cards[i]!, index: i }; }
  return null;
};
export const allCards = (b: Board, o: { archived?: boolean } = {}) => b.lists.filter(l => o.archived || !l.archived).flatMap(l => l.cards.filter(c => o.archived || !c.archived).map(c => ({ card: c, list: l })));
export const memberOf = (b: Board, id: string) => b.members.find(m => m.id === id) ?? null;
export const progress = (c: Card) => { const items = c.checklists.flatMap(x => x.items); return { done: items.filter(i => i.done).length, total: items.length }; };

export type Due = "none" | "complete" | "overdue" | "soon" | "later";
/** Trello's due badge colours: complete (green), overdue (red), due within 24h (yellow), later (grey). */
export function dueStatus(c: Pick<Card, "due" | "dueComplete">, at = Date.now()): Due {
  if (!c.due) return "none"; if (c.dueComplete) return "complete";
  const d = new Date(c.due).getTime() - at; return d < 0 ? "overdue" : d <= 864e5 ? "soon" : "later";
}
export const fmtDate = (iso: string, o: { time?: boolean; year?: boolean } = {}) => {
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  const s = d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(o.year || d.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}) });
  return o.time ? `${s}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : s;
};
export const ago = (iso: string, at = Date.now()) => {
  const s = Math.max(0, (at - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)} minute${s < 120 ? "" : "s"} ago`; if (s < 86400) return `${Math.floor(s / 3600)} hour${s < 7200 ? "" : "s"} ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} day${s < 172800 ? "" : "s"} ago`; return fmtDate(iso, { time: true });
};
/** Card Aging power-up: 0 fresh, 1 (7d), 2 (14d), 3 (28d+). */
export const ageLevel = (c: Card, at = Date.now()) => { const d = (at - new Date(c.updatedAt).getTime()) / 864e5; return d >= 28 ? 3 : d >= 14 ? 2 : d >= 7 ? 1 : 0; };
export const canEdit = (b: Board, userId: string | null) => { const m = userId ? memberOf(b, userId) : null; return !!m && m.role !== "observer"; };
export const isAdmin = (b: Board, userId: string | null) => { const m = userId ? memberOf(b, userId) : null; return !!m && m.role === "admin"; };
