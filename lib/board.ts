// Pure kanban model + operations. Every operation takes a State and returns a new State (never mutates), so the UI, the API and the tests share one source of truth.
export const LABELS = [
  { id: "green", name: "Green", color: "#4BCE97" }, { id: "yellow", name: "Yellow", color: "#F5CD47" }, { id: "orange", name: "Orange", color: "#FEA362" },
  { id: "red", name: "Red", color: "#F87168" }, { id: "purple", name: "Purple", color: "#9F8FEF" }, { id: "blue", name: "Blue", color: "#579DFF" },
] as const;
export const BACKGROUNDS = [
  { id: "ocean", name: "Ocean", css: "linear-gradient(135deg,#0C66E4,#1D9BD1)" }, { id: "grape", name: "Grape", css: "linear-gradient(135deg,#6E5DC6,#B25FC0)" },
  { id: "sunrise", name: "Sunrise", css: "linear-gradient(135deg,#E56910,#F5A623)" }, { id: "forest", name: "Forest", css: "linear-gradient(135deg,#216E4E,#4C9A5F)" },
  { id: "rose", name: "Rose", css: "linear-gradient(135deg,#C9372C,#E774BB)" }, { id: "slate", name: "Slate", css: "linear-gradient(135deg,#44546F,#626F86)" },
] as const;
export type LabelId = (typeof LABELS)[number]["id"]; export type BgId = (typeof BACKGROUNDS)[number]["id"];
export type CheckItem = { id: string; text: string; done: boolean };
export type Card = { id: string; title: string; desc: string; labels: LabelId[]; due: string | null; checklist: CheckItem[]; archived: boolean; createdAt: string };
export type List = { id: string; title: string; archived: boolean; cards: Card[] };
export type Board = { id: string; title: string; bg: BgId; lists: List[]; createdAt: string };
export type State = { boards: Board[] };
export const LIMITS = { boards: 50, lists: 40, cards: 400, title: 200, desc: 8000, checklist: 60 };

let n = 0;
export const uid = (p = "") => p + Date.now().toString(36) + (n++).toString(36) + Math.random().toString(36).slice(2, 6);
const now = () => new Date().toISOString();
const clip = (s: unknown, max: number) => (typeof s === "string" ? s.slice(0, max) : "");

export const mkCard = (title: string): Card => ({ id: uid("c"), title: title.trim().slice(0, LIMITS.title), desc: "", labels: [], due: null, checklist: [], archived: false, createdAt: now() });
export const mkList = (title: string, cards: Card[] = []): List => ({ id: uid("l"), title: title.trim().slice(0, LIMITS.title), archived: false, cards });
export const mkBoard = (title: string, bg: BgId = "ocean", lists: List[] = []): Board => ({ id: uid("b"), title: title.trim().slice(0, LIMITS.title) || "Untitled board", bg, lists, createdAt: now() });

const mapBoard = (s: State, id: string, f: (b: Board) => Board): State => ({ boards: s.boards.map(b => (b.id === id ? f(b) : b)) });
const mapList = (b: Board, id: string, f: (l: List) => List): Board => ({ ...b, lists: b.lists.map(l => (l.id === id ? f(l) : l)) });

export const addBoard = (s: State, board: Board): State => (s.boards.length >= LIMITS.boards ? s : { boards: [board, ...s.boards] });
export const deleteBoard = (s: State, id: string): State => ({ boards: s.boards.filter(b => b.id !== id) });
export const patchBoard = (s: State, id: string, p: Partial<Pick<Board, "title" | "bg">>): State => mapBoard(s, id, b => ({ ...b, title: p.title !== undefined ? (p.title.trim().slice(0, LIMITS.title) || b.title) : b.title, bg: p.bg ?? b.bg }));
export const addList = (s: State, boardId: string, title: string): State => title.trim() ? mapBoard(s, boardId, b => b.lists.length >= LIMITS.lists ? b : { ...b, lists: [...b.lists, mkList(title)] }) : s;
export const renameList = (s: State, boardId: string, listId: string, title: string): State => title.trim() ? mapBoard(s, boardId, b => mapList(b, listId, l => ({ ...l, title: title.trim().slice(0, LIMITS.title) }))) : s;
export const setListArchived = (s: State, boardId: string, listId: string, archived: boolean): State => mapBoard(s, boardId, b => mapList(b, listId, l => ({ ...l, archived })));
export const addCard = (s: State, boardId: string, listId: string, title: string): State => title.trim() ? mapBoard(s, boardId, b => mapList(b, listId, l => l.cards.length >= LIMITS.cards ? l : { ...l, cards: [...l.cards, mkCard(title)] })) : s;
export const patchCard = (s: State, boardId: string, cardId: string, p: Partial<Omit<Card, "id" | "createdAt">>): State =>
  mapBoard(s, boardId, b => ({ ...b, lists: b.lists.map(l => ({ ...l, cards: l.cards.map(c => c.id === cardId ? { ...c, ...p, title: p.title !== undefined ? (p.title.trim().slice(0, LIMITS.title) || c.title) : c.title, desc: p.desc !== undefined ? p.desc.slice(0, LIMITS.desc) : c.desc } : c) })) }));
export const findCard = (b: Board, cardId: string): { list: List; card: Card; index: number } | null => { for (const l of b.lists) { const i = l.cards.findIndex(c => c.id === cardId); if (i >= 0) return { list: l, card: l.cards[i]!, index: i }; } return null; };

/** Move a list to `toIndex` (index in the full lists array, clamped). */
export const moveList = (s: State, boardId: string, listId: string, toIndex: number): State => mapBoard(s, boardId, b => {
  const from = b.lists.findIndex(l => l.id === listId); if (from < 0) return b; const a = [...b.lists]; const [m] = a.splice(from, 1); a.splice(Math.max(0, Math.min(a.length, toIndex)), 0, m!); return { ...b, lists: a }; });
/** Move a card into `toListId` at `toIndex` (index in that list's cards array as it is AFTER the card is removed, clamped). Works within and across lists. */
export const moveCard = (s: State, boardId: string, cardId: string, toListId: string, toIndex: number): State => mapBoard(s, boardId, b => {
  const hit = findCard(b, cardId); if (!hit || !b.lists.some(l => l.id === toListId)) return b;
  const lists = b.lists.map(l => l.id === hit.list.id ? { ...l, cards: l.cards.filter(c => c.id !== cardId) } : l);
  return { ...b, lists: lists.map(l => { if (l.id !== toListId) return l; const a = [...l.cards]; a.splice(Math.max(0, Math.min(a.length, toIndex)), 0, hit.card); return { ...l, cards: a }; }) }; });
export const copyCard = (s: State, boardId: string, cardId: string): State => mapBoard(s, boardId, b => { const h = findCard(b, cardId); if (!h) return b;
  const copy: Card = { ...h.card, id: uid("c"), title: (h.card.title + " (copy)").slice(0, LIMITS.title), checklist: h.card.checklist.map(i => ({ ...i, id: uid("i") })), createdAt: now() };
  return mapList(b, h.list.id, l => { const a = [...l.cards]; a.splice(h.index + 1, 0, copy); return { ...l, cards: a }; }); });
export const deleteCard = (s: State, boardId: string, cardId: string): State => mapBoard(s, boardId, b => ({ ...b, lists: b.lists.map(l => ({ ...l, cards: l.cards.filter(c => c.id !== cardId) })) }));

export const addCheckItem = (s: State, boardId: string, cardId: string, text: string): State => { if (!text.trim()) return s; const b = s.boards.find(x => x.id === boardId); const h = b && findCard(b, cardId); if (!h || h.card.checklist.length >= LIMITS.checklist) return s;
  return patchCard(s, boardId, cardId, { checklist: [...h.card.checklist, { id: uid("i"), text: text.trim().slice(0, LIMITS.title), done: false }] }); };
export const checklistProgress = (c: Card) => ({ done: c.checklist.filter(i => i.done).length, total: c.checklist.length });

export type Due = "none" | "done" | "overdue" | "soon" | "later";
/** "soon" = due within 24h. A card whose checklist is fully done counts as complete. */
export function dueStatus(c: Card, at = new Date()): Due {
  if (!c.due) return "none"; const p = checklistProgress(c); if (p.total > 0 && p.done === p.total) return "done";
  const t = new Date(c.due + "T23:59:59").getTime(); const d = t - at.getTime(); return d < 0 ? "overdue" : d <= 864e5 ? "soon" : "later"; }

export type Filter = { q: string; label: LabelId | null };
export const matches = (c: Card, f: Filter) => (!f.q.trim() || (c.title + " " + c.desc).toLowerCase().includes(f.q.trim().toLowerCase())) && (!f.label || c.labels.includes(f.label));

export function demoState(): State {
  const c = (t: string, o: Partial<Card> = {}): Card => ({ ...mkCard(t), ...o });
  const day = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
  const ck = (...t: [string, boolean][]) => t.map(([text, done]) => ({ id: uid("i"), text, done }));
  return { boards: [mkBoard("Launch plan", "ocean", [
    mkList("Ideas", [c("Landing page copy review", { labels: ["purple"], desc: "Read the hero out loud. If it needs a breath, cut it." }), c("Podcast guest list", { labels: ["blue"] })]),
    mkList("To do", [c("Write release notes", { labels: ["green"], due: day(2), checklist: ck(["Draft", false], ["Screenshots", false], ["Proofread", false]) }), c("Fix signup edge case", { labels: ["red", "orange"], due: day(-1) }), c("Book the demo room", { due: day(0) })]),
    mkList("In progress", [c("Ship the pricing page", { labels: ["blue", "yellow"], due: day(5), desc: "Compare against list prices; link the source.", checklist: ck(["Wireframe", true], ["Build", true], ["QA", false], ["Launch", false]) })]),
    mkList("Done", [c("Pick a domain", { labels: ["green"], checklist: ck(["Shortlist", true], ["Buy", true]) }), c("Set up analytics")]),
  ]), mkBoard("Weekend trip", "forest", [mkList("Pack", [c("Chargers"), c("Rain jacket")]), mkList("Plan", [c("Reserve campsite", { due: day(9) })])]), mkBoard("Reading list", "grape", [mkList("Next", [c("Staff Engineer")]), mkList("Reading", []), mkList("Finished", [])])] };
}
export const welcomeState = (): State => ({ boards: [mkBoard("My first board", "ocean", [mkList("To do", [mkCard("Add your first card"), mkCard("Drag cards between lists")]), mkList("Doing", []), mkList("Done", [mkCard("Create a board")])])] });

/** Clean untrusted state from the client before storing it. */
export function sanitizeState(input: any): State | null {
  if (!input || !Array.isArray(input.boards)) return null; const lab = new Set<string>(LABELS.map(l => l.id)), bgs = new Set<string>(BACKGROUNDS.map(b => b.id)); const ids = new Set<string>();
  const id = (v: unknown, p: string) => { let x = typeof v === "string" && /^[A-Za-z0-9_-]{3,40}$/.test(v) && !ids.has(v) ? v : uid(p); ids.add(x); return x; };
  return { boards: input.boards.slice(0, LIMITS.boards).map((b: any): Board => ({ id: id(b?.id, "b"), title: clip(b?.title, LIMITS.title).trim() || "Untitled board", bg: bgs.has(b?.bg) ? b.bg : "ocean", createdAt: clip(b?.createdAt, 40) || now(),
    lists: (Array.isArray(b?.lists) ? b.lists : []).slice(0, LIMITS.lists).map((l: any): List => ({ id: id(l?.id, "l"), title: clip(l?.title, LIMITS.title) || "Untitled", archived: !!l?.archived,
      cards: (Array.isArray(l?.cards) ? l.cards : []).slice(0, LIMITS.cards).map((c: any): Card => ({ id: id(c?.id, "c"), title: clip(c?.title, LIMITS.title) || "Untitled", desc: clip(c?.desc, LIMITS.desc), archived: !!c?.archived, createdAt: clip(c?.createdAt, 40) || now(),
        labels: (Array.isArray(c?.labels) ? c.labels : []).filter((x: unknown) => typeof x === "string" && lab.has(x)).slice(0, 6), due: typeof c?.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(c.due) ? c.due : null,
        checklist: (Array.isArray(c?.checklist) ? c.checklist : []).slice(0, LIMITS.checklist).map((i: any): CheckItem => ({ id: id(i?.id, "i"), text: clip(i?.text, LIMITS.title), done: !!i?.done })) })) })) })) };
}
