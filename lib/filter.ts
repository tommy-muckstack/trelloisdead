// Board filter, modelled on Trello's filter panel: keyword, members, card status, due date, labels and activity,
// with "Any match" (a card matches one option in each category used) or "Exact match" (every selected option).
import { type Board, type Card, dueStatus } from "./model";

export type DueOpt = "none" | "overdue" | "day" | "week" | "month";
export type ActivityOpt = "week" | "2weeks" | "4weeks" | "stale";
export type Filter = { q: string; members: string[]; due: DueOpt[]; status: ("complete" | "incomplete")[]; labels: string[]; activity: ActivityOpt[]; exact: boolean };
export const EMPTY_FILTER: Filter = { q: "", members: [], due: [], status: [], labels: [], activity: [], exact: false };
export const filterCount = (f: Filter) => (f.q.trim() ? 1 : 0) + f.members.length + f.due.length + f.status.length + f.labels.length + f.activity.length;
export const isFiltering = (f: Filter) => filterCount(f) > 0;

/** Keywords: whitespace-separated words match any; "quoted phrases" match exactly; "*" matches every card. */
export function keywordMatch(c: Card, b: Board | null, q: string): boolean {
  const s = q.trim(); if (!s || s === "*") return true;
  const hay = [c.title, c.desc, ...(b ? b.fields.filter(f => f.type === "text").map(f => String(c.custom[f.id] ?? "")) : [])].join("\n").toLowerCase();
  const phrases = [...s.matchAll(/"([^"]+)"/g)].map(m => m[1]!.toLowerCase()); const words = s.replace(/"[^"]*"/g, " ").toLowerCase().split(/\s+/).filter(Boolean);
  return [...phrases, ...words].some(w => hay.includes(w));
}
const dueMatch = (c: Card, o: DueOpt, at: number) => {
  if (o === "none") return !c.due; if (!c.due) return false; const st = dueStatus(c, at); const t = new Date(c.due).getTime() - at;
  if (o === "overdue") return st === "overdue"; if (c.dueComplete || t < 0) return false;
  return t <= (o === "day" ? 1 : o === "week" ? 7 : 30) * 864e5;
};
const actMatch = (c: Card, o: ActivityOpt, at: number) => { const age = at - new Date(c.updatedAt).getTime(); return o === "stale" ? age > 28 * 864e5 : age <= (o === "week" ? 7 : o === "2weeks" ? 14 : 28) * 864e5; };
export function matches(c: Card, f: Filter, ctx: { me: string; board?: Board | null; at?: number }): boolean {
  const at = ctx.at ?? Date.now(); const all = f.exact;
  const cat = <T,>(opts: T[], test: (o: T) => boolean) => !opts.length || (all ? opts.every(test) : opts.some(test));
  return keywordMatch(c, ctx.board ?? null, f.q)
    && cat(f.members, m => (m === "none" ? c.members.length === 0 : c.members.includes(m === "me" ? ctx.me : m)))
    && cat(f.status, s => (s === "complete" ? c.dueComplete : !c.dueComplete))
    && cat(f.due, o => dueMatch(c, o, at))
    && cat(f.labels, l => (l === "none" ? c.labels.length === 0 : c.labels.includes(l)))
    && cat(f.activity, o => actMatch(c, o, at));
}
