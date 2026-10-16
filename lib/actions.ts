// Board edits as data. The client applies an Action optimistically; the server validates it (normalizeAction),
// checks permissions (allowed) and applies the same function to the stored board. Automation rules run inside
// applyAction, so a rule fires exactly once (on the server copy) and the client sees the same result.
import {
  LIMITS, LABEL_COLORS, POWERUPS, REMINDERS, clip, findCard, isBg, isId, memberOf, mkCard, mkList, progress, fmtDate,
  type Activity, type Board, type ButtonDef, type Card, type CheckItem, type Checklist, type Cover, type CustomField, type FieldValue, type List, type Person, type Place,
  type Role, type Rule, type RuleStep, type SortBy, type BoardSettings, type Attachment, type Visibility,
} from "./model";

// NB: `by`, `byName`, `at` and `id` are stamped on every action and stripped before sending, so action bodies must not use those field names.
type Base = { id: string; at: string; by: string; byName: string; rule?: boolean };
export type CardPatch = Partial<Pick<Card, "title" | "desc" | "start" | "due" | "dueComplete" | "reminder" | "cover" | "location" | "archived" | "isTemplate">>;
export type BoardPatch = Partial<Pick<Board, "title" | "desc" | "bg" | "visibility" | "workspaceId" | "closed" | "isTemplate">> & { settings?: Partial<BoardSettings> };
export type ActionBody =
  | { t: "board.patch"; patch: BoardPatch }
  | { t: "label.create"; labelId: string; name: string; color: string } | { t: "label.update"; labelId: string; name: string; color: string } | { t: "label.delete"; labelId: string }
  | { t: "list.add"; listId: string; title: string; index: number } | { t: "list.patch"; listId: string; title?: string; archived?: boolean; limit?: number | null }
  | { t: "list.move"; listId: string; index: number } | { t: "list.copy"; listId: string; newId: string; title: string }
  | { t: "list.sort"; listId: string; sortBy: SortBy } | { t: "list.archiveCards"; listId: string } | { t: "list.moveCards"; listId: string; toListId: string } | { t: "list.watch"; listId: string; on: boolean }
  | { t: "list.delete"; listId: string }
  | { t: "card.add"; listId: string; cardId: string; title: string; index: number }
  | { t: "card.patch"; cardId: string; patch: CardPatch } | { t: "card.move"; cardId: string; listId: string; index: number }
  | { t: "card.copy"; cardId: string; newId: string; listId: string; index: number; title: string; keep: { labels: boolean; members: boolean; checklists: boolean; attachments: boolean; comments: boolean; dates: boolean }; template?: boolean }
  | { t: "card.delete"; cardId: string } | { t: "card.label"; cardId: string; labelId: string; on: boolean } | { t: "card.member"; cardId: string; userId: string; on: boolean }
  | { t: "card.members"; cardId: string; ids: string[] } | { t: "card.watch"; cardId: string; on: boolean } | { t: "card.vote"; cardId: string; on: boolean }
  | { t: "card.field"; cardId: string; fieldId: string; value: FieldValue }
  | { t: "checklist.add"; cardId: string; checklistId: string; title: string; copyFrom?: string | null } | { t: "checklist.rename"; cardId: string; checklistId: string; title: string }
  | { t: "checklist.delete"; cardId: string; checklistId: string }
  | { t: "item.add"; cardId: string; checklistId: string; itemId: string; text: string } | { t: "item.patch"; cardId: string; checklistId: string; itemId: string; text?: string; done?: boolean; due?: string | null; member?: string | null }
  | { t: "item.delete"; cardId: string; checklistId: string; itemId: string } | { t: "item.toCard"; cardId: string; checklistId: string; itemId: string; newId: string }
  | { t: "comment.add"; cardId: string; commentId: string; text: string } | { t: "comment.edit"; cardId: string; commentId: string; text: string } | { t: "comment.delete"; cardId: string; commentId: string }
  | { t: "attachment.add"; cardId: string; attachment: Attachment } | { t: "attachment.rename"; cardId: string; attachmentId: string; name: string } | { t: "attachment.delete"; cardId: string; attachmentId: string }
  | { t: "field.save"; field: CustomField } | { t: "field.delete"; fieldId: string }
  | { t: "powerup.toggle"; powerUp: string; on: boolean }
  | { t: "rule.save"; rule: Rule } | { t: "rule.delete"; ruleId: string } | { t: "button.save"; button: ButtonDef } | { t: "button.delete"; buttonId: string } | { t: "button.run"; buttonId: string; cardId: string | null }
  | { t: "member.add"; person: Person; role: Role } | { t: "member.role"; userId: string; role: Role } | { t: "member.remove"; userId: string } | { t: "member.profile"; person: Person };
export type Action = Base & ActionBody;
export type ActionType = ActionBody["t"];
/** Actions only the server may create (they carry identities read from user docs). */
export const SERVER_ONLY: ActionType[] = ["member.add", "member.profile"];

// ---- helpers (structural sharing: only touched lists/cards are copied) ----
const editLists = (b: Board, f: (l: List) => List): Board => ({ ...b, lists: b.lists.map(f) });
const editList = (b: Board, listId: string, f: (l: List) => List): Board => editLists(b, l => (l.id === listId ? f(l) : l));
const editCard = (b: Board, cardId: string, f: (c: Card) => Card): Board => editLists(b, l => (l.cards.some(c => c.id === cardId) ? { ...l, cards: l.cards.map(c => (c.id === cardId ? f(c) : c)) } : l));
const touch = (c: Card, at: string): Card => ({ ...c, updatedAt: at });
const toggle = (arr: string[], v: string, on: boolean) => (on ? (arr.includes(v) ? arr : [...arr, v]) : arr.filter(x => x !== v));
const clamp = (i: number, max: number) => Math.max(0, Math.min(max, Number.isFinite(i) ? Math.floor(i) : max));
const q = (s: string) => `“${s}”`;
function log(b: Board, a: Action, cardId: string | null, text: string, ctext = ""): Board {
  const e: Activity = { id: a.id + "a" + b.activity.length.toString(36), at: a.at, by: a.by, byName: a.byName, cardId, text: (a.rule ? "Automation: " : "") + text, ctext: ctext ? (a.rule ? "Automation: " : "") + ctext : "" };
  return { ...b, activity: [e, ...b.activity].slice(0, LIMITS.activity) };
}
const cardTitle = (b: Board, cardId: string) => findCard(b, cardId)?.card.title ?? "a card";
const listTitle = (b: Board, listId: string) => b.lists.find(l => l.id === listId)?.title ?? "a list";
const nameOf = (b: Board, userId: string) => memberOf(b, userId)?.name ?? "someone";

export function sortCards(cards: Card[], by: SortBy): Card[] {
  const a = [...cards];
  if (by === "newest") a.sort((x, y) => y.createdAt.localeCompare(x.createdAt)); else if (by === "oldest") a.sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  else if (by === "title") a.sort((x, y) => x.title.localeCompare(y.title, undefined, { sensitivity: "base" }));
  else if (by === "votes") a.sort((x, y) => y.votes.length - x.votes.length);
  else a.sort((x, y) => (x.due ? new Date(x.due).getTime() : Infinity) - (y.due ? new Date(y.due).getTime() : Infinity));
  return a;
}

/** Apply one action. Unknown targets are ignored (the board comes back unchanged), never thrown. */
export function applyAction(b0: Board, a: Action): Board {
  let b = applyBase(b0, a);
  if (b === b0) return b0;
  b = { ...b, updatedAt: a.at };
  if (!a.rule) b = runRules(b0, b, a);
  return b;
}

function applyBase(b: Board, a: Action): Board {
  switch (a.t) {
    case "board.patch": {
      const p = a.patch; let nb: Board = { ...b };
      if (p.title !== undefined && p.title.trim() && p.title.trim() !== b.title) { nb.title = p.title.trim().slice(0, LIMITS.title); nb = log(nb, a, null, `renamed this board to ${q(nb.title)}`); }
      if (p.desc !== undefined) nb.desc = p.desc.slice(0, LIMITS.desc);
      if (p.bg !== undefined && isBg(p.bg) && p.bg !== b.bg) { nb.bg = p.bg; nb = log(nb, a, null, "changed the background of this board"); }
      if (p.visibility && p.visibility !== b.visibility) { nb.visibility = p.visibility; nb = log(nb, a, null, `made this board visible to ${p.visibility === "private" ? "board members only" : p.visibility === "workspace" ? "its Workspace" : "the public"}`); }
      if (p.workspaceId) nb.workspaceId = p.workspaceId;
      if (p.closed !== undefined && p.closed !== b.closed) { nb.closed = p.closed; nb = log(nb, a, null, p.closed ? "closed this board" : "reopened this board"); }
      if (p.isTemplate !== undefined) nb.isTemplate = p.isTemplate;
      if (p.settings) nb.settings = { ...b.settings, ...p.settings };
      return nb;
    }
    case "label.create": if (b.labels.length >= LIMITS.labels || b.labels.some(l => l.id === a.labelId)) return b; return { ...b, labels: [...b.labels, { id: a.labelId, name: a.name.slice(0, 100), color: a.color }] };
    case "label.update": return b.labels.some(l => l.id === a.labelId) ? { ...b, labels: b.labels.map(l => (l.id === a.labelId ? { ...l, name: a.name.slice(0, 100), color: a.color } : l)) } : b;
    case "label.delete": if (!b.labels.some(l => l.id === a.labelId)) return b; return editLists({ ...b, labels: b.labels.filter(l => l.id !== a.labelId) }, l => ({ ...l, cards: l.cards.map(c => (c.labels.includes(a.labelId) ? { ...c, labels: c.labels.filter(x => x !== a.labelId) } : c)) }));
    case "list.add": {
      if (b.lists.length >= LIMITS.lists || b.lists.some(l => l.id === a.listId) || !a.title.trim()) return b;
      const lists = [...b.lists]; lists.splice(clamp(a.index, lists.length), 0, mkList(a.listId, a.title));
      return log({ ...b, lists }, a, null, `added ${q(a.title.trim())} to this board`);
    }
    case "list.patch": {
      const l = b.lists.find(x => x.id === a.listId); if (!l) return b;
      let nb = editList(b, a.listId, x => ({ ...x, title: a.title !== undefined && a.title.trim() ? a.title.trim().slice(0, LIMITS.title) : x.title, archived: a.archived ?? x.archived, limit: a.limit !== undefined ? a.limit : x.limit }));
      if (a.archived !== undefined && a.archived !== l.archived) nb = log(nb, a, null, a.archived ? `archived list ${q(l.title)}` : `sent list ${q(l.title)} to the board`);
      if (a.title !== undefined && a.title.trim() && a.title.trim() !== l.title) nb = log(nb, a, null, `renamed list ${q(l.title)} to ${q(a.title.trim())}`);
      return nb;
    }
    case "list.delete": { const l = b.lists.find(x => x.id === a.listId); if (!l) return b; return log({ ...b, lists: b.lists.filter(x => x.id !== a.listId) }, a, null, `deleted list ${q(l.title)}`); }
    case "list.move": {
      const from = b.lists.findIndex(l => l.id === a.listId); if (from < 0) return b;
      const lists = [...b.lists]; const [m] = lists.splice(from, 1); lists.splice(clamp(a.index, lists.length), 0, m!); return { ...b, lists };
    }
    case "list.copy": {
      const src = b.lists.find(l => l.id === a.listId); if (!src || b.lists.some(l => l.id === a.newId) || b.lists.length >= LIMITS.lists) return b;
      let seq = b.seq; const cards = src.cards.filter(c => !c.archived).map((c, i) => ({ ...cloneCard(c, `${a.newId}c${i.toString(36)}`, ++seq, a.at, { labels: true, members: true, checklists: true, attachments: true, comments: false, dates: true }) }));
      const lists = [...b.lists]; lists.splice(b.lists.indexOf(src) + 1, 0, { ...mkList(a.newId, a.title || src.title, cards), limit: src.limit });
      return log({ ...b, lists, seq }, a, null, `copied list ${q(src.title)}`);
    }
    case "list.sort": return b.lists.some(l => l.id === a.listId) ? editList(b, a.listId, l => ({ ...l, cards: sortCards(l.cards, a.sortBy) })) : b;
    case "list.archiveCards": {
      const l = b.lists.find(x => x.id === a.listId); if (!l || !l.cards.some(c => !c.archived)) return b;
      return log(editList(b, a.listId, x => ({ ...x, cards: x.cards.map(c => (c.archived ? c : { ...c, archived: true, updatedAt: a.at })) })), a, null, `archived all cards in list ${q(l.title)}`);
    }
    case "list.moveCards": {
      const from = b.lists.find(x => x.id === a.listId), to = b.lists.find(x => x.id === a.toListId); if (!from || !to || from === to) return b;
      const moving = from.cards.filter(c => !c.archived); if (!moving.length) return b;
      const nb = editLists(b, l => (l.id === from.id ? { ...l, cards: l.cards.filter(c => c.archived) } : l.id === to.id ? { ...l, cards: [...l.cards, ...moving] } : l));
      return log(nb, a, null, `moved all cards in ${q(from.title)} to ${q(to.title)}`);
    }
    case "list.watch": return b.lists.some(l => l.id === a.listId) ? editList(b, a.listId, l => ({ ...l, watchers: toggle(l.watchers, a.by, a.on) })) : b;
    case "card.add": {
      const l = b.lists.find(x => x.id === a.listId); if (!l || !a.title.trim() || findCard(b, a.cardId) || l.cards.length >= LIMITS.cards) return b;
      const seq = b.seq + 1; const card = mkCard(a.cardId, seq, a.title, a.at);
      const nb = editList({ ...b, seq }, a.listId, x => { const cards = [...x.cards]; cards.splice(clamp(a.index, cards.length), 0, card); return { ...x, cards }; });
      return log(nb, a, a.cardId, `added ${q(card.title)} to ${q(l.title)}`, `added this card to ${l.title}`);
    }
    case "card.patch": {
      const hit = findCard(b, a.cardId); if (!hit) return b; const c = hit.card, p = a.patch;
      const next: Card = { ...c };
      if (p.title !== undefined && p.title.trim()) next.title = p.title.trim().slice(0, LIMITS.title);
      if (p.desc !== undefined) next.desc = p.desc.slice(0, LIMITS.desc);
      if (p.start !== undefined) next.start = p.start;
      if (p.due !== undefined) { next.due = p.due; if (!p.due) next.dueComplete = p.dueComplete ?? c.dueComplete; }
      if (p.dueComplete !== undefined) next.dueComplete = p.dueComplete;
      if (p.reminder !== undefined) next.reminder = p.reminder;
      if (p.cover !== undefined) next.cover = p.cover;
      if (p.location !== undefined) next.location = p.location;
      if (p.archived !== undefined) next.archived = p.archived;
      if (p.isTemplate !== undefined) next.isTemplate = p.isTemplate;
      let nb = editCard(b, a.cardId, () => touch(next, a.at));
      if (next.title !== c.title) nb = log(nb, a, c.id, `renamed ${q(c.title)} to ${q(next.title)}`, `renamed this card from ${q(c.title)}`);
      if (next.archived !== c.archived) nb = log(nb, a, c.id, next.archived ? `archived ${q(next.title)}` : `sent ${q(next.title)} to the board`, next.archived ? "archived this card" : "sent this card to the board");
      if (next.due !== c.due) nb = next.due ? log(nb, a, c.id, `set ${q(next.title)} to be due ${fmtDate(next.due, { time: true })}`, `set this card to be due ${fmtDate(next.due, { time: true })}`) : log(nb, a, c.id, `removed the due date from ${q(next.title)}`, "removed the due date from this card");
      if (next.dueComplete !== c.dueComplete) nb = log(nb, a, c.id, `marked ${q(next.title)} as ${next.dueComplete ? "complete" : "incomplete"}`, `marked this card as ${next.dueComplete ? "complete" : "incomplete"}`);
      if (next.isTemplate !== c.isTemplate) nb = log(nb, a, c.id, `${next.isTemplate ? "made" : "unmade"} ${q(next.title)} a template`, next.isTemplate ? "made this card a template" : "turned this template back into a card");
      if (next.location && next.location !== c.location) nb = log(nb, a, c.id, `added a location to ${q(next.title)}`, `set the location to ${next.location.name}`);
      return nb;
    }
    case "card.move": {
      const hit = findCard(b, a.cardId); const to = b.lists.find(l => l.id === a.listId); if (!hit || !to) return b;
      const lists = b.lists.map(l => (l.id === hit.list.id ? { ...l, cards: l.cards.filter(c => c.id !== a.cardId) } : l));
      const moved = hit.list.id !== to.id ? touch(hit.card, a.at) : hit.card;
      const nb: Board = { ...b, lists: lists.map(l => { if (l.id !== to.id) return l; const cards = [...l.cards]; cards.splice(clamp(a.index, cards.length), 0, moved); return { ...l, cards }; }) };
      return hit.list.id !== to.id ? log(nb, a, a.cardId, `moved ${q(hit.card.title)} from ${hit.list.title} to ${to.title}`, `moved this card from ${hit.list.title} to ${to.title}`) : nb;
    }
    case "card.copy": {
      const hit = findCard(b, a.cardId); const to = b.lists.find(l => l.id === a.listId); if (!hit || !to || findCard(b, a.newId)) return b;
      const seq = b.seq + 1; const copy = { ...cloneCard(hit.card, a.newId, seq, a.at, a.keep), title: (a.title || hit.card.title).slice(0, LIMITS.title), isTemplate: false };
      const nb = editList({ ...b, seq }, to.id, l => { const cards = [...l.cards]; cards.splice(clamp(a.index, cards.length), 0, copy); return { ...l, cards }; });
      return log(nb, a, a.newId, a.template ? `created ${q(copy.title)} from a template in ${to.title}` : `copied ${q(copy.title)} from ${q(hit.card.title)} in list ${hit.list.title}`, a.template ? "created this card from a template" : `copied this card from ${q(hit.card.title)} in list ${hit.list.title}`);
    }
    case "card.delete": { const hit = findCard(b, a.cardId); if (!hit) return b; return log(editList(b, hit.list.id, l => ({ ...l, cards: l.cards.filter(c => c.id !== a.cardId) })), a, null, `deleted card #${hit.card.num} from ${hit.list.title}`); }
    case "card.label": {
      const hit = findCard(b, a.cardId); if (!hit || !b.labels.some(l => l.id === a.labelId) || hit.card.labels.includes(a.labelId) === a.on) return b;
      return editCard(b, a.cardId, c => touch({ ...c, labels: toggle(c.labels, a.labelId, a.on) }, a.at));
    }
    case "card.member": {
      const hit = findCard(b, a.cardId); if (!hit || !memberOf(b, a.userId) || hit.card.members.includes(a.userId) === a.on) return b;
      const nb = editCard(b, a.cardId, c => touch({ ...c, members: toggle(c.members, a.userId, a.on), watchers: a.on && a.userId === a.by ? toggle(c.watchers, a.by, true) : c.watchers }, a.at));
      const self = a.userId === a.by, who = nameOf(b, a.userId);
      return a.on ? log(nb, a, a.cardId, self ? `joined ${q(hit.card.title)}` : `added ${who} to ${q(hit.card.title)}`, self ? "joined this card" : `added ${who} to this card`)
        : log(nb, a, a.cardId, self ? `left ${q(hit.card.title)}` : `removed ${who} from ${q(hit.card.title)}`, self ? "left this card" : `removed ${who} from this card`);
    }
    case "card.members": { const hit = findCard(b, a.cardId); if (!hit) return b; const ids = a.ids.filter(id => memberOf(b, id)); return editCard(b, a.cardId, c => touch({ ...c, members: ids }, a.at)); }
    case "card.watch": return findCard(b, a.cardId) ? editCard(b, a.cardId, c => ({ ...c, watchers: toggle(c.watchers, a.by, a.on) })) : b;
    case "card.vote": return findCard(b, a.cardId) && b.powerUps.includes("voting") ? editCard(b, a.cardId, c => ({ ...c, votes: toggle(c.votes, a.by, a.on) })) : b;
    case "card.field": {
      const f = b.fields.find(x => x.id === a.fieldId); if (!f || !findCard(b, a.cardId)) return b;
      const v = coerceField(f, a.value); return editCard(b, a.cardId, c => { const custom = { ...c.custom }; if (v === null) delete custom[f.id]; else custom[f.id] = v; return touch({ ...c, custom }, a.at); });
    }
    case "checklist.add": {
      const hit = findCard(b, a.cardId); if (!hit || hit.card.checklists.length >= LIMITS.checklists || hit.card.checklists.some(x => x.id === a.checklistId)) return b;
      const src = a.copyFrom ? allChecklists(b).find(x => x.id === a.copyFrom) : null;
      const cl: Checklist = { id: a.checklistId, title: (a.title.trim() || "Checklist").slice(0, LIMITS.title), items: src ? src.items.map((i, k) => ({ ...i, id: `${a.checklistId}i${k.toString(36)}`, done: false })) : [] };
      return log(editCard(b, a.cardId, c => touch({ ...c, checklists: [...c.checklists, cl] }, a.at)), a, a.cardId, `added ${cl.title} to ${q(hit.card.title)}`, `added ${cl.title} to this card`);
    }
    case "checklist.rename": return editChecklist(b, a.cardId, a.checklistId, a.at, cl => (a.title.trim() ? { ...cl, title: a.title.trim().slice(0, LIMITS.title) } : cl));
    case "checklist.delete": { const hit = findCard(b, a.cardId); const cl = hit?.card.checklists.find(x => x.id === a.checklistId); if (!hit || !cl) return b; return log(editCard(b, a.cardId, c => touch({ ...c, checklists: c.checklists.filter(x => x.id !== a.checklistId) }, a.at)), a, a.cardId, `removed ${cl.title} from ${q(hit.card.title)}`, `removed ${cl.title} from this card`); }
    case "item.add": return editChecklist(b, a.cardId, a.checklistId, a.at, cl => (!a.text.trim() || cl.items.length >= LIMITS.items || cl.items.some(i => i.id === a.itemId) ? cl : { ...cl, items: [...cl.items, { id: a.itemId, text: a.text.trim().slice(0, LIMITS.title), done: false, due: null, member: null }] }));
    case "item.patch": {
      const hit = findCard(b, a.cardId); const item = hit?.card.checklists.find(x => x.id === a.checklistId)?.items.find(i => i.id === a.itemId); if (!hit || !item) return b;
      const nb = editChecklist(b, a.cardId, a.checklistId, a.at, cl => ({ ...cl, items: cl.items.map(i => (i.id === a.itemId ? { ...i, text: a.text !== undefined && a.text.trim() ? a.text.trim().slice(0, LIMITS.title) : i.text, done: a.done ?? i.done, due: a.due !== undefined ? a.due : i.due, member: a.member !== undefined ? (a.member && memberOf(b, a.member) ? a.member : null) : i.member } : i)) }));
      return a.done !== undefined && a.done !== item.done ? log(nb, a, a.cardId, `${a.done ? "completed" : "marked"} ${item.text} on ${q(hit.card.title)}${a.done ? "" : " incomplete"}`, `${a.done ? "completed" : "marked"} ${item.text} on this card${a.done ? "" : " incomplete"}`) : nb;
    }
    case "item.delete": return editChecklist(b, a.cardId, a.checklistId, a.at, cl => ({ ...cl, items: cl.items.filter(i => i.id !== a.itemId) }));
    case "item.toCard": {
      const hit = findCard(b, a.cardId); const item = hit?.card.checklists.find(x => x.id === a.checklistId)?.items.find(i => i.id === a.itemId); if (!hit || !item || findCard(b, a.newId)) return b;
      const seq = b.seq + 1; const card = mkCard(a.newId, seq, item.text, a.at, { due: item.due, members: item.member ? [item.member] : [] });
      let nb = editChecklist({ ...b, seq }, a.cardId, a.checklistId, a.at, cl => ({ ...cl, items: cl.items.filter(i => i.id !== a.itemId) }));
      nb = editList(nb, hit.list.id, l => { const cards = [...l.cards]; cards.splice(cards.findIndex(c => c.id === a.cardId) + 1, 0, card); return { ...l, cards }; });
      return log(nb, a, a.newId, `converted ${item.text} from a checklist item on ${q(hit.card.title)}`, `converted this card from a checklist item on ${q(hit.card.title)}`);
    }
    case "comment.add": {
      const hit = findCard(b, a.cardId); if (!hit || !a.text.trim() || hit.card.comments.length >= LIMITS.comments || hit.card.comments.some(c => c.id === a.commentId)) return b;
      return editCard(b, a.cardId, c => touch({ ...c, comments: [{ id: a.commentId, by: a.by, byName: a.byName, text: a.text.trim().slice(0, LIMITS.comment), at: a.at, edited: null }, ...c.comments], watchers: toggle(c.watchers, a.by, true) }, a.at));
    }
    case "comment.edit": { const hit = findCard(b, a.cardId); const cm = hit?.card.comments.find(x => x.id === a.commentId); if (!cm || cm.by !== a.by || !a.text.trim()) return b; return editCard(b, a.cardId, c => ({ ...c, comments: c.comments.map(x => (x.id === a.commentId ? { ...x, text: a.text.trim().slice(0, LIMITS.comment), edited: a.at } : x)) })); }
    case "comment.delete": { const hit = findCard(b, a.cardId); const cm = hit?.card.comments.find(x => x.id === a.commentId); if (!cm || (cm.by !== a.by && memberOf(b, a.by)?.role !== "admin")) return b; return editCard(b, a.cardId, c => ({ ...c, comments: c.comments.filter(x => x.id !== a.commentId) })); }
    case "attachment.add": {
      const hit = findCard(b, a.cardId); if (!hit || hit.card.attachments.length >= LIMITS.attachments || hit.card.attachments.some(x => x.id === a.attachment.id)) return b;
      const att = { ...a.attachment, by: a.by, at: a.at }; const isImg = att.kind === "file" && att.mime.startsWith("image/");
      const nb = editCard(b, a.cardId, c => touch({ ...c, attachments: [att, ...c.attachments], cover: isImg && !c.cover ? { color: null, attachmentId: att.id, size: "normal" } : c.cover }, a.at));
      return log(nb, a, a.cardId, `attached ${att.name} to ${q(hit.card.title)}`, `attached ${att.name} to this card`);
    }
    case "attachment.rename": return findCard(b, a.cardId) && a.name.trim() ? editCard(b, a.cardId, c => ({ ...c, attachments: c.attachments.map(x => (x.id === a.attachmentId ? { ...x, name: a.name.trim().slice(0, 256) } : x)) })) : b;
    case "attachment.delete": { const hit = findCard(b, a.cardId); const att = hit?.card.attachments.find(x => x.id === a.attachmentId); if (!hit || !att) return b; return log(editCard(b, a.cardId, c => touch({ ...c, attachments: c.attachments.filter(x => x.id !== a.attachmentId), cover: c.cover?.attachmentId === a.attachmentId ? null : c.cover }, a.at)), a, a.cardId, `deleted the ${att.name} attachment from ${q(hit.card.title)}`, `deleted the ${att.name} attachment from this card`); }
    case "field.save": { const exists = b.fields.some(f => f.id === a.field.id); if (!exists && b.fields.length >= LIMITS.fields) return b; return { ...b, fields: exists ? b.fields.map(f => (f.id === a.field.id ? a.field : f)) : [...b.fields, a.field] }; }
    case "field.delete": if (!b.fields.some(f => f.id === a.fieldId)) return b; return editLists({ ...b, fields: b.fields.filter(f => f.id !== a.fieldId) }, l => ({ ...l, cards: l.cards.map(c => (a.fieldId in c.custom ? { ...c, custom: Object.fromEntries(Object.entries(c.custom).filter(([k]) => k !== a.fieldId)) } : c)) }));
    case "powerup.toggle": {
      if (!POWERUPS.some(p => p.id === a.powerUp) || b.powerUps.includes(a.powerUp) === a.on) return b; const name = POWERUPS.find(p => p.id === a.powerUp)!.name;
      return log({ ...b, powerUps: a.on ? [...b.powerUps, a.powerUp] : b.powerUps.filter(p => p !== a.powerUp) }, a, null, `${a.on ? "enabled" : "disabled"} the ${name} Power-Up`);
    }
    case "rule.save": { const exists = b.rules.some(r => r.id === a.rule.id); if (!exists && b.rules.length >= LIMITS.rules) return b; return { ...b, rules: exists ? b.rules.map(r => (r.id === a.rule.id ? a.rule : r)) : [...b.rules, a.rule] }; }
    case "rule.delete": return { ...b, rules: b.rules.filter(r => r.id !== a.ruleId) };
    case "button.save": { const exists = b.buttons.some(r => r.id === a.button.id); if (!exists && b.buttons.length >= LIMITS.rules) return b; return { ...b, buttons: exists ? b.buttons.map(r => (r.id === a.button.id ? a.button : r)) : [...b.buttons, a.button] }; }
    case "button.delete": return { ...b, buttons: b.buttons.filter(r => r.id !== a.buttonId) };
    case "button.run": {
      const btn = b.buttons.find(x => x.id === a.buttonId); if (!btn || (btn.scope === "card" && (!a.cardId || !findCard(b, a.cardId)))) return b;
      let nb = log(b, a, btn.scope === "card" ? a.cardId : null, `ran the ${q(btn.name)} button${btn.scope === "card" ? ` on ${q(cardTitle(b, a.cardId!))}` : ""}`, `ran the ${q(btn.name)} button on this card`);
      btn.steps.forEach((s, i) => { const x = stepAction(nb, s, a.cardId, a, `${a.id}s${i}`); if (x) nb = applyBase(nb, x); });
      return nb;
    }
    case "member.add": {
      if (memberOf(b, a.person.id)) return b.members.find(m => m.id === a.person.id)!.role === a.role ? b : { ...b, members: b.members.map(m => (m.id === a.person.id ? { ...m, role: a.role } : m)) };
      return log({ ...b, members: [...b.members, { ...a.person, role: a.role }] }, a, null, a.person.id === a.by ? "joined this board" : `added ${a.person.name} to this board`);
    }
    case "member.profile": return memberOf(b, a.person.id) ? { ...b, members: b.members.map(m => (m.id === a.person.id ? { ...a.person, role: m.role } : m)) } : b;
    case "member.role": {
      const m = memberOf(b, a.userId); if (!m || m.role === a.role) return b;
      if (m.role === "admin" && a.role !== "admin" && b.members.filter(x => x.role === "admin").length < 2) return b; // a board always keeps an admin
      return log({ ...b, members: b.members.map(x => (x.id === a.userId ? { ...x, role: a.role } : x)) }, a, null, `made ${m.name} ${a.role === "admin" ? "an admin" : a.role === "observer" ? "an observer" : "a member"} of this board`);
    }
    case "member.remove": {
      const m = memberOf(b, a.userId); if (!m) return b;
      if (m.role === "admin" && b.members.filter(x => x.role === "admin").length < 2) return b;
      const nb = editLists({ ...b, members: b.members.filter(x => x.id !== a.userId) }, l => ({ ...l, cards: l.cards.map(c => (c.members.includes(a.userId) || c.watchers.includes(a.userId) ? { ...c, members: c.members.filter(x => x !== a.userId), watchers: c.watchers.filter(x => x !== a.userId) } : c)) }));
      return log(nb, a, null, a.userId === a.by ? "left this board" : `removed ${m.name} from this board`);
    }
  }
  return b;
}

const allChecklists = (b: Board) => b.lists.flatMap(l => l.cards.flatMap(c => c.checklists));
function editChecklist(b: Board, cardId: string, checklistId: string, at: string, f: (cl: Checklist) => Checklist): Board {
  const hit = findCard(b, cardId); if (!hit || !hit.card.checklists.some(x => x.id === checklistId)) return b;
  return editCard(b, cardId, c => touch({ ...c, checklists: c.checklists.map(x => (x.id === checklistId ? f(x) : x)) }, at));
}
function cloneCard(c: Card, id: string, num: number, at: string, keep: { labels: boolean; members: boolean; checklists: boolean; attachments: boolean; comments: boolean; dates: boolean }): Card {
  const atts = keep.attachments ? c.attachments.map((x, i) => ({ ...x, id: `${id}a${i.toString(36)}` })) : [];
  const coverAtt = c.cover?.attachmentId ? atts[c.attachments.findIndex(x => x.id === c.cover!.attachmentId)] : undefined;
  return mkCard(id, num, c.title, at, {
    desc: c.desc, labels: keep.labels ? [...c.labels] : [], members: keep.members ? [...c.members] : [], start: keep.dates ? c.start : null, due: keep.dates ? c.due : null, reminder: keep.dates ? c.reminder : -1,
    checklists: keep.checklists ? c.checklists.map((cl, k) => ({ ...cl, id: `${id}k${k.toString(36)}`, items: cl.items.map((i, j) => ({ ...i, id: `${id}k${k.toString(36)}i${j.toString(36)}` })) })) : [],
    attachments: atts, comments: keep.comments ? c.comments.map((x, i) => ({ ...x, id: `${id}m${i.toString(36)}` })) : [],
    cover: c.cover ? (c.cover.attachmentId ? (coverAtt ? { ...c.cover, attachmentId: coverAtt.id } : null) : { ...c.cover }) : null, location: c.location, custom: { ...c.custom },
  });
}
export function coerceField(f: CustomField, v: unknown): FieldValue {
  if (v === null || v === undefined || v === "") return null;
  switch (f.type) {
    case "text": return clip(v, 1000) || null;
    case "number": { const x = typeof v === "number" ? v : Number(v); return Number.isFinite(x) ? x : null; }
    case "date": return typeof v === "string" && !isNaN(Date.parse(v)) ? new Date(v).toISOString() : null;
    case "checkbox": return v === true ? true : null;
    case "list": return typeof v === "string" && f.options.some(o => o.id === v) ? v : null;
  }
}

// ---- automation ----
type Fired = { kind: Rule["trigger"]["kind"]; cardId: string; listId: string | null; labelId: string | null };
function triggers(before: Board, after: Board, a: Action): Fired[] {
  const out: Fired[] = [];
  if (a.t === "card.add" || a.t === "card.copy" || a.t === "item.toCard") { const id = a.t === "card.add" ? a.cardId : a.newId; const hit = findCard(after, id); if (hit) out.push({ kind: "card.added", cardId: id, listId: hit.list.id, labelId: null }); }
  if (a.t === "card.move") { const b0 = findCard(before, a.cardId), b1 = findCard(after, a.cardId); if (b0 && b1 && b0.list.id !== b1.list.id) out.push({ kind: "card.moved", cardId: a.cardId, listId: b1.list.id, labelId: null }); }
  if (a.t === "card.patch" && a.patch.dueComplete === true && findCard(before, a.cardId)?.card.dueComplete === false) out.push({ kind: "card.complete", cardId: a.cardId, listId: null, labelId: null });
  if (a.t === "item.patch" && a.done === true) { const p0 = findCard(before, a.cardId), p1 = findCard(after, a.cardId); if (p0 && p1) { const x = progress(p0.card), y = progress(p1.card); if (y.total > 0 && y.done === y.total && x.done < x.total) out.push({ kind: "checklist.done", cardId: a.cardId, listId: null, labelId: null }); } }
  if (a.t === "card.label" && a.on && findCard(after, a.cardId)?.card.labels.includes(a.labelId) && !findCard(before, a.cardId)?.card.labels.includes(a.labelId)) out.push({ kind: "label.added", cardId: a.cardId, listId: null, labelId: a.labelId });
  return out;
}
export const ruleMatches = (r: Rule, f: Fired) => r.enabled && r.trigger.kind === f.kind && (!r.trigger.listId || r.trigger.listId === f.listId) && (r.trigger.kind !== "label.added" || !r.trigger.labelId || r.trigger.labelId === f.labelId);
function runRules(before: Board, after: Board, a: Action): Board {
  let b = after; let k = 0;
  for (const f of triggers(before, after, a)) for (const r of b.rules) {
    if (!ruleMatches(r, f)) continue;
    r.steps.forEach(s => { const x = stepAction(b, s, f.cardId, a, `${a.id}r${(k++).toString(36)}`); if (x) b = applyBase(b, x); });
  }
  return b;
}
/** Turn an automation step into a concrete action (rule: true, so it never re-triggers rules). */
export function stepAction(b: Board, s: RuleStep, cardId: string | null, a: Base, id: string): Action | null {
  const base = { id, at: a.at, by: a.by, byName: a.byName, rule: true };
  switch (s.t) {
    case "move": return cardId ? { ...base, t: "card.move", cardId, listId: s.listId, index: s.pos === "top" ? 0 : 1e6 } : null;
    case "label": return cardId ? { ...base, t: "card.label", cardId, labelId: s.labelId, on: s.on } : null;
    case "complete": return cardId ? { ...base, t: "card.patch", cardId, patch: { dueComplete: s.on } } : null;
    case "due": { if (!cardId) return null; const d = s.days === null ? null : new Date(new Date(a.at).getTime() + s.days * 864e5).toISOString(); return { ...base, t: "card.patch", cardId, patch: { due: d, ...(d ? { dueComplete: false } : {}) } }; }
    case "archive": return cardId ? { ...base, t: "card.patch", cardId, patch: { archived: true } } : null;
    case "join": return cardId && memberOf(b, a.by) ? { ...base, t: "card.member", cardId, userId: a.by, on: true } : null;
    case "clearMembers": return cardId ? { ...base, t: "card.members", cardId, ids: [] } : null;
    case "checklist": return cardId ? { ...base, t: "checklist.add", cardId, checklistId: id + "k", title: s.title } : null;
    case "sortList": return { ...base, t: "list.sort", listId: s.listId, sortBy: s.by };
    case "archiveList": return { ...base, t: "list.archiveCards", listId: s.listId };
    case "moveAll": return { ...base, t: "list.moveCards", listId: s.from, toListId: s.to };
  }
}
export function describeStep(b: Board, s: RuleStep): string {
  const lt = (id: string) => listTitle(b, id), lb = (id: string) => { const l = b.labels.find(x => x.id === id); return l ? `the ${l.name || LABEL_COLORS.find(c => c.id === l.color)?.name || ""} label` : "a label"; };
  switch (s.t) {
    case "move": return `move the card to the ${s.pos} of list ${q(lt(s.listId))}`; case "label": return `${s.on ? "add" : "remove"} ${lb(s.labelId)}`;
    case "complete": return `mark the card ${s.on ? "complete" : "incomplete"}`; case "due": return s.days === null ? "remove the due date" : `set due in ${s.days} day${s.days === 1 ? "" : "s"}`;
    case "archive": return "archive the card"; case "join": return "add me to the card"; case "clearMembers": return "remove all members from the card";
    case "checklist": return `add checklist ${q(s.title)}`; case "sortList": return `sort list ${q(lt(s.listId))} by ${s.by}`; case "archiveList": return `archive all cards in list ${q(lt(s.listId))}`;
    case "moveAll": return `move all cards in ${q(lt(s.from))} to ${q(lt(s.to))}`;
  }
}
export function describeTrigger(b: Board, t: Rule["trigger"]): string {
  const where = t.listId ? ` list ${q(listTitle(b, t.listId))}` : " any list";
  switch (t.kind) {
    case "card.added": return `when a card is added to${where}`; case "card.moved": return `when a card is moved into${where}`;
    case "card.complete": return "when a card is marked complete"; case "checklist.done": return "when all checklist items on a card are completed";
    case "label.added": { const l = b.labels.find(x => x.id === t.labelId); return `when ${l ? `the ${l.name || l.color.replace("_", " ")} label` : "any label"} is added to a card`; }
  }
}

// ---- permissions ----
export function allowed(b: Board, a: Action): boolean {
  const m = memberOf(b, a.by);
  if (a.t === "member.add") return !m ? b.visibility !== "private" && a.person.id === a.by : m.role !== "observer"; // join (non-member, server checked workspace) or invite
  if (!m) return false;
  if (a.t === "comment.add") return b.settings.comments !== "disabled" && (m.role !== "observer" || b.settings.comments !== "members");
  if (m.role === "observer") return a.t === "card.watch" || a.t === "list.watch" || a.t === "comment.edit" || a.t === "comment.delete" || (a.t === "member.remove" && a.userId === a.by);
  if (a.t === "board.patch" && (a.patch.visibility || a.patch.workspaceId || a.patch.closed !== undefined || a.patch.isTemplate !== undefined || a.patch.settings)) return m.role === "admin";
  if (a.t === "member.role") return m.role === "admin";
  if (a.t === "member.remove") return a.userId === a.by || m.role === "admin";
  if (a.t === "list.delete") return m.role === "admin";
  return true;
}

// ---- validation of untrusted actions (server) ----
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null);
const bool = (v: unknown) => (typeof v === "boolean" ? v : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const dt = (v: unknown) => (v === null ? null : typeof v === "string" && !isNaN(Date.parse(v)) ? new Date(v).toISOString() : undefined);
const day = (v: unknown) => (v === null ? null : typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
const colorId = (v: unknown) => (typeof v === "string" && LABEL_COLORS.some(c => c.id === v) ? v : null);
const ROLES: Role[] = ["admin", "normal", "observer"]; const VIS: Visibility[] = ["private", "workspace", "public"]; const SORTS: SortBy[] = ["newest", "oldest", "title", "due", "votes"];
function cover(v: any): Cover | null | undefined { if (v === null) return null; if (!v || typeof v !== "object") return undefined; const color = v.color === null ? null : colorId(v.color); const att = v.attachmentId === null || v.attachmentId === undefined ? null : isId(v.attachmentId) ? v.attachmentId : null; if (!color && !att) return null; return { color: att ? null : color, attachmentId: att, size: v.size === "full" ? "full" : "normal" }; }
function place(v: any): Place | null | undefined { if (v === null) return null; if (!v || typeof v !== "object") return undefined; const lat = num(v.lat), lng = num(v.lng); if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined; return { name: clip(v.name, 200) || "Location", address: clip(v.address, 400), lat, lng }; }
function step(v: any): RuleStep | null {
  if (!v || typeof v !== "object") return null;
  switch (v.t) {
    case "move": return isId(v.listId) ? { t: "move", listId: v.listId, pos: v.pos === "top" ? "top" : "bottom" } : null;
    case "label": return isId(v.labelId) ? { t: "label", labelId: v.labelId, on: v.on !== false } : null;
    case "complete": return { t: "complete", on: v.on !== false };
    case "due": return { t: "due", days: v.days === null ? null : Math.max(0, Math.min(365, Math.floor(num(v.days) ?? 1))) };
    case "archive": case "join": case "clearMembers": return { t: v.t };
    case "checklist": return { t: "checklist", title: clip(v.title, 200) || "Checklist" };
    case "sortList": return isId(v.listId) && SORTS.includes(v.by) ? { t: "sortList", listId: v.listId, by: v.by } : null;
    case "archiveList": return isId(v.listId) ? { t: "archiveList", listId: v.listId } : null;
    case "moveAll": return isId(v.from) && isId(v.to) ? { t: "moveAll", from: v.from, to: v.to } : null;
  }
  return null;
}
const steps = (v: unknown) => (Array.isArray(v) ? v.slice(0, 10).map(step).filter((x): x is RuleStep => !!x) : []);
const TRIGGERS = ["card.added", "card.moved", "card.complete", "checklist.done", "label.added"] as const;
function field(v: any): CustomField | null {
  if (!v || !isId(v.id) || !["text", "number", "date", "checkbox", "list"].includes(v.type)) return null;
  return { id: v.id, name: clip(v.name, 100) || "Field", type: v.type, front: !!v.front, options: v.type === "list" && Array.isArray(v.options) ? v.options.slice(0, 50).filter((o: any) => isId(o?.id)).map((o: any) => ({ id: o.id, name: clip(o.name, 100), color: colorId(o.color) ?? "black_light" })) : [] };
}
/** Validate an untrusted action body from a client. Identity (`by`, `byName`) and time are stamped by the caller. */
export function normalizeAction(raw: any): ActionBody | null {
  if (!raw || typeof raw !== "object" || typeof raw.t !== "string") return null;
  const r = raw; const id = (k: string) => (isId(r[k]) ? (r[k] as string) : null);
  switch (r.t as ActionType) {
    case "board.patch": {
      const p = r.patch ?? {}; const out: BoardPatch = {};
      if (typeof p.title === "string") out.title = p.title.slice(0, LIMITS.title); if (typeof p.desc === "string") out.desc = p.desc.slice(0, LIMITS.desc);
      if (isBg(p.bg)) out.bg = p.bg; if (VIS.includes(p.visibility)) out.visibility = p.visibility; if (isId(p.workspaceId)) out.workspaceId = p.workspaceId;
      if (typeof p.closed === "boolean") out.closed = p.closed; if (typeof p.isTemplate === "boolean") out.isTemplate = p.isTemplate;
      if (p.settings && typeof p.settings === "object") { const s: Partial<BoardSettings> = {}; if (typeof p.settings.covers === "boolean") s.covers = p.settings.covers; if (typeof p.settings.completeOnFront === "boolean") s.completeOnFront = p.settings.completeOnFront; if (["members", "observers", "workspace", "disabled"].includes(p.settings.comments)) s.comments = p.settings.comments; out.settings = s; }
      return { t: "board.patch", patch: out };
    }
    case "label.create": case "label.update": { const labelId = id("labelId"), color = colorId(r.color); return labelId && color ? { t: r.t, labelId, name: clip(r.name, 100), color } : null; }
    case "label.delete": { const labelId = id("labelId"); return labelId ? { t: "label.delete", labelId } : null; }
    case "list.add": { const listId = id("listId"); return listId && str(r.title, LIMITS.title) ? { t: "list.add", listId, title: r.title, index: num(r.index) ?? 1e6 } : null; }
    case "list.patch": { const listId = id("listId"); if (!listId) return null; const o: ActionBody = { t: "list.patch", listId }; if (typeof r.title === "string") o.title = r.title.slice(0, LIMITS.title); if (typeof r.archived === "boolean") o.archived = r.archived; if (r.limit === null || (typeof r.limit === "number" && r.limit >= 0 && r.limit <= 999)) o.limit = r.limit === null ? null : Math.floor(r.limit); return o; }
    case "list.delete": { const listId = id("listId"); return listId ? { t: "list.delete", listId } : null; }
    case "list.move": { const listId = id("listId"); return listId ? { t: "list.move", listId, index: num(r.index) ?? 0 } : null; }
    case "list.copy": { const listId = id("listId"), newId = id("newId"); return listId && newId ? { t: "list.copy", listId, newId, title: clip(r.title, LIMITS.title) } : null; }
    case "list.sort": { const listId = id("listId"); return listId && SORTS.includes(r.sortBy) ? { t: "list.sort", listId, sortBy: r.sortBy } : null; }
    case "list.archiveCards": { const listId = id("listId"); return listId ? { t: "list.archiveCards", listId } : null; }
    case "list.moveCards": { const listId = id("listId"), toListId = id("toListId"); return listId && toListId ? { t: "list.moveCards", listId, toListId } : null; }
    case "list.watch": { const listId = id("listId"); return listId ? { t: "list.watch", listId, on: !!r.on } : null; }
    case "card.add": { const listId = id("listId"), cardId = id("cardId"); return listId && cardId && typeof r.title === "string" ? { t: "card.add", listId, cardId, title: r.title.slice(0, LIMITS.title), index: num(r.index) ?? 1e6 } : null; }
    case "card.patch": {
      const cardId = id("cardId"); if (!cardId) return null; const p = r.patch ?? {}; const o: CardPatch = {};
      if (typeof p.title === "string") o.title = p.title.slice(0, LIMITS.title); if (typeof p.desc === "string") o.desc = p.desc.slice(0, LIMITS.desc);
      const s = day(p.start); if (s !== undefined && "start" in p) o.start = s; const d = dt(p.due); if (d !== undefined && "due" in p) o.due = d;
      if (typeof p.dueComplete === "boolean") o.dueComplete = p.dueComplete; if (REMINDERS.some(x => x.v === p.reminder)) o.reminder = p.reminder;
      const cv = cover(p.cover); if (cv !== undefined && "cover" in p) o.cover = cv; const pl = place(p.location); if (pl !== undefined && "location" in p) o.location = pl;
      if (typeof p.archived === "boolean") o.archived = p.archived; if (typeof p.isTemplate === "boolean") o.isTemplate = p.isTemplate;
      return { t: "card.patch", cardId, patch: o };
    }
    case "card.move": { const cardId = id("cardId"), listId = id("listId"); return cardId && listId ? { t: "card.move", cardId, listId, index: num(r.index) ?? 1e6 } : null; }
    case "card.copy": {
      const cardId = id("cardId"), newId = id("newId"), listId = id("listId"); const k = r.keep ?? {};
      return cardId && newId && listId ? { t: "card.copy", cardId, newId, listId, index: num(r.index) ?? 1e6, title: clip(r.title, LIMITS.title), keep: { labels: !!k.labels, members: !!k.members, checklists: !!k.checklists, attachments: !!k.attachments, comments: !!k.comments, dates: !!k.dates }, template: !!r.template } : null;
    }
    case "card.delete": { const cardId = id("cardId"); return cardId ? { t: "card.delete", cardId } : null; }
    case "card.label": { const cardId = id("cardId"), labelId = id("labelId"); return cardId && labelId ? { t: "card.label", cardId, labelId, on: !!r.on } : null; }
    case "card.member": { const cardId = id("cardId"), userId = id("userId"); return cardId && userId ? { t: "card.member", cardId, userId, on: !!r.on } : null; }
    case "card.members": { const cardId = id("cardId"); return cardId && Array.isArray(r.ids) ? { t: "card.members", cardId, ids: r.ids.filter(isId).slice(0, 100) } : null; }
    case "card.watch": case "card.vote": { const cardId = id("cardId"); return cardId ? { t: r.t, cardId, on: !!r.on } : null; }
    case "card.field": { const cardId = id("cardId"), fieldId = id("fieldId"); const v = r.value; return cardId && fieldId && (v === null || ["string", "number", "boolean"].includes(typeof v)) ? { t: "card.field", cardId, fieldId, value: typeof v === "string" ? v.slice(0, 1000) : v } : null; }
    case "checklist.add": { const cardId = id("cardId"), checklistId = id("checklistId"); return cardId && checklistId ? { t: "checklist.add", cardId, checklistId, title: clip(r.title, LIMITS.title), copyFrom: isId(r.copyFrom) ? r.copyFrom : null } : null; }
    case "checklist.rename": { const cardId = id("cardId"), checklistId = id("checklistId"); return cardId && checklistId ? { t: "checklist.rename", cardId, checklistId, title: clip(r.title, LIMITS.title) } : null; }
    case "checklist.delete": { const cardId = id("cardId"), checklistId = id("checklistId"); return cardId && checklistId ? { t: "checklist.delete", cardId, checklistId } : null; }
    case "item.add": { const cardId = id("cardId"), checklistId = id("checklistId"), itemId = id("itemId"); return cardId && checklistId && itemId ? { t: "item.add", cardId, checklistId, itemId, text: clip(r.text, LIMITS.title) } : null; }
    case "item.patch": {
      const cardId = id("cardId"), checklistId = id("checklistId"), itemId = id("itemId"); if (!cardId || !checklistId || !itemId) return null;
      const o: ActionBody = { t: "item.patch", cardId, checklistId, itemId }; if (typeof r.text === "string") o.text = r.text.slice(0, LIMITS.title); if (typeof r.done === "boolean") o.done = r.done;
      const d = dt(r.due); if ("due" in r && d !== undefined) o.due = d; if ("member" in r) o.member = isId(r.member) ? r.member : null; return o;
    }
    case "item.delete": { const cardId = id("cardId"), checklistId = id("checklistId"), itemId = id("itemId"); return cardId && checklistId && itemId ? { t: "item.delete", cardId, checklistId, itemId } : null; }
    case "item.toCard": { const cardId = id("cardId"), checklistId = id("checklistId"), itemId = id("itemId"), newId = id("newId"); return cardId && checklistId && itemId && newId ? { t: "item.toCard", cardId, checklistId, itemId, newId } : null; }
    case "comment.add": case "comment.edit": { const cardId = id("cardId"), commentId = id("commentId"); return cardId && commentId && typeof r.text === "string" ? { t: r.t, cardId, commentId, text: r.text.slice(0, LIMITS.comment) } : null; }
    case "comment.delete": { const cardId = id("cardId"), commentId = id("commentId"); return cardId && commentId ? { t: "comment.delete", cardId, commentId } : null; }
    case "attachment.add": {
      const cardId = id("cardId"); const x = r.attachment; if (!cardId || !x || !isId(x.id)) return null;
      const kind = x.kind === "file" ? "file" : "link"; const url = clip(x.url, 2000);
      if (kind === "link" && !/^https?:\/\//i.test(url)) return null; if (kind === "file" && !/^\/[\w/.-]*api\/files\/[A-Za-z0-9_-]+$/.test(url)) return null;
      return { t: "attachment.add", cardId, attachment: { id: x.id, name: clip(x.name, 256) || url, url, kind, mime: clip(x.mime, 100), size: Math.max(0, Math.floor(num(x.size) ?? 0)), by: "", at: "" } };
    }
    case "attachment.rename": { const cardId = id("cardId"), attachmentId = id("attachmentId"); return cardId && attachmentId ? { t: "attachment.rename", cardId, attachmentId, name: clip(r.name, 256) } : null; }
    case "attachment.delete": { const cardId = id("cardId"), attachmentId = id("attachmentId"); return cardId && attachmentId ? { t: "attachment.delete", cardId, attachmentId } : null; }
    case "field.save": { const f = field(r.field); return f ? { t: "field.save", field: f } : null; }
    case "field.delete": { const fieldId = id("fieldId"); return fieldId ? { t: "field.delete", fieldId } : null; }
    case "powerup.toggle": return typeof r.powerUp === "string" && POWERUPS.some(p => p.id === r.powerUp) ? { t: "powerup.toggle", powerUp: r.powerUp, on: !!r.on } : null;
    case "rule.save": {
      const x = r.rule; if (!x || !isId(x.id) || !TRIGGERS.includes(x.trigger?.kind)) return null;
      const st = steps(x.steps); if (!st.length) return null;
      return { t: "rule.save", rule: { id: x.id, name: clip(x.name, 200), enabled: x.enabled !== false, trigger: { kind: x.trigger.kind, listId: isId(x.trigger.listId) ? x.trigger.listId : null, labelId: isId(x.trigger.labelId) ? x.trigger.labelId : null }, steps: st } };
    }
    case "rule.delete": { const ruleId = id("ruleId"); return ruleId ? { t: "rule.delete", ruleId } : null; }
    case "button.save": { const x = r.button; if (!x || !isId(x.id)) return null; const st = steps(x.steps); if (!st.length) return null; return { t: "button.save", button: { id: x.id, name: clip(x.name, 100) || "Button", scope: x.scope === "board" ? "board" : "card", steps: st } }; }
    case "button.delete": { const buttonId = id("buttonId"); return buttonId ? { t: "button.delete", buttonId } : null; }
    case "button.run": { const buttonId = id("buttonId"); return buttonId ? { t: "button.run", buttonId, cardId: isId(r.cardId) ? r.cardId : null } : null; }
    case "member.role": { const userId = id("userId"); return userId && ROLES.includes(r.role) ? { t: "member.role", userId, role: r.role } : null; }
    case "member.remove": { const userId = id("userId"); return userId ? { t: "member.remove", userId } : null; }
  }
  return null;
}

// ---- undo ----
/** The action that reverses `a` on board `b` (the board BEFORE `a`), or null when it can't be undone (deletions, like Trello). */
export function inverse(b: Board, a: Action, id: string): ActionBody | null {
  void id;
  switch (a.t) {
    case "card.move": { const hit = findCard(b, a.cardId); return hit ? { t: "card.move", cardId: a.cardId, listId: hit.list.id, index: hit.index } : null; }
    case "card.patch": { const hit = findCard(b, a.cardId); if (!hit) return null; const c = hit.card; const p: CardPatch = {}; for (const k of Object.keys(a.patch) as (keyof CardPatch)[]) (p as any)[k] = c[k]; return { t: "card.patch", cardId: a.cardId, patch: p }; }
    case "card.label": return { ...a, t: "card.label", on: !a.on };
    case "card.member": return { t: "card.member", cardId: a.cardId, userId: a.userId, on: !a.on };
    case "card.watch": case "card.vote": return { t: a.t, cardId: a.cardId, on: !a.on };
    case "card.add": return { t: "card.patch", cardId: a.cardId, patch: { archived: true } };
    case "list.patch": { const l = b.lists.find(x => x.id === a.listId); if (!l) return null; return { t: "list.patch", listId: a.listId, ...(a.title !== undefined ? { title: l.title } : {}), ...(a.archived !== undefined ? { archived: l.archived } : {}), ...(a.limit !== undefined ? { limit: l.limit } : {}) }; }
    case "list.move": { const i = b.lists.findIndex(x => x.id === a.listId); return i >= 0 ? { t: "list.move", listId: a.listId, index: i } : null; }
    case "item.patch": { const it = findCard(b, a.cardId)?.card.checklists.find(x => x.id === a.checklistId)?.items.find(x => x.id === a.itemId); if (!it) return null; return { t: "item.patch", cardId: a.cardId, checklistId: a.checklistId, itemId: a.itemId, ...(a.text !== undefined ? { text: it.text } : {}), ...(a.done !== undefined ? { done: it.done } : {}), ...(a.due !== undefined ? { due: it.due } : {}), ...(a.member !== undefined ? { member: it.member } : {}) }; }
    case "board.patch": { const p: BoardPatch = {}; for (const k of Object.keys(a.patch) as (keyof BoardPatch)[]) if (k !== "settings") (p as any)[k] = (b as any)[k]; return Object.keys(p).length ? { t: "board.patch", patch: p } : null; }
    default: return null;
  }
}
export type { CheckItem };
