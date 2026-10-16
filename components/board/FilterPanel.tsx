"use client";
// Trello-style filter: keyword, members, card status, due date, labels and activity, with Any match / Exact match.
import { useBoard } from "@/components/app/BoardProvider";
import { Avatar, PopHead } from "@/components/app/ui";
import { labelColor } from "@/lib/model";
import { EMPTY_FILTER, type ActivityOpt, type DueOpt, type Filter } from "@/lib/filter";
import { Clock, CircleAlert, CalendarClock, User, UserX, Tag } from "lucide-react";

export function FilterPanel({ filter, setFilter, onClose }: { filter: Filter; setFilter: (f: Filter) => void; onClose: () => void }) {
  const { board, me } = useBoard();
  const tog = <K extends "members" | "due" | "labels" | "activity" | "status">(k: K, v: Filter[K][number]) => { const arr = filter[k] as string[]; setFilter({ ...filter, [k]: arr.includes(v as string) ? arr.filter(x => x !== v) : [...arr, v] }); };
  const box = (k: "members" | "due" | "labels" | "activity" | "status", v: string, label: React.ReactNode, testid?: string) => <label className="f-row" data-testid={testid}><input type="checkbox" checked={(filter[k] as string[]).includes(v)} onChange={() => tog(k, v as never)} />{label}</label>;
  const meM = board.members.find(m => m.id === me);
  return <div className="b-filter" data-testid="filter-panel">
    <PopHead title="Filter" onClose={onClose} />
    <h6>Keyword</h6><input className="tr-in" autoFocus aria-label="Filter by keyword" placeholder="Enter a keyword…" value={filter.q} onChange={e => setFilter({ ...filter, q: e.target.value })} />
    <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>Search cards, members, labels, and more. Use “quotes” for an exact phrase or * for all cards.</p>
    <h6>Members</h6>
    {box("members", "none", <><span className="f-ico"><UserX size={14} /></span>No members</>)}
    {box("members", "me", <>{meM ? <Avatar p={meM} size="sm" /> : <span className="f-ico"><User size={14} /></span>}Cards assigned to me</>, "filter-me")}
    {board.members.filter(m => m.id !== me).map(m => <span key={m.id}>{box("members", m.id, <><Avatar p={m} size="sm" />{m.name}</>)}</span>)}
    <h6>Card status</h6>
    {box("status", "complete", "Marked as complete")}{box("status", "incomplete", "Not marked as complete")}
    <h6>Due date</h6>
    {([["none", "No dates", <CalendarClock key="i" size={14} />], ["overdue", "Overdue", <CircleAlert key="i" size={14} color="#c9372c" />], ["day", "Due in the next day", <Clock key="i" size={14} color="#946f00" />], ["week", "Due in the next week", <Clock key="i" size={14} />], ["month", "Due in the next month", <Clock key="i" size={14} />]] as [DueOpt, string, React.ReactNode][]).map(([v, l, ic]) => <span key={v}>{box("due", v, <><span className="f-ico">{ic}</span>{l}</>)}</span>)}
    <h6>Labels</h6>
    {box("labels", "none", <><span className="f-ico"><Tag size={14} /></span>No labels</>)}
    {board.labels.map(l => <span key={l.id}>{box("labels", l.id, <span className={"f-lbl lc-" + l.color} title={labelColor(l.color).name}>{l.name}</span>, `filter-label-${l.color}`)}</span>)}
    <h6>Activity</h6>
    {([["week", "Active in the last week"], ["2weeks", "Active in the last two weeks"], ["4weeks", "Active in the last four weeks"], ["stale", "Without activity in the last four weeks"]] as [ActivityOpt, string][]).map(([v, l]) => <span key={v}>{box("activity", v, l)}</span>)}
    <hr className="tr-sep" />
    <label className="tr-lbl" htmlFor="f-match" style={{ marginTop: 0 }}>Match</label>
    <select id="f-match" className="tr-in" value={filter.exact ? "exact" : "any"} onChange={e => setFilter({ ...filter, exact: e.target.value === "exact" })}><option value="any">Any match</option><option value="exact">Exact match</option></select>
    <p className="muted" style={{ fontSize: 12, margin: "4px 0 8px" }}>{filter.exact ? "Exact match: cards must match every option you selected." : "Any match: cards match at least one option in each category."}</p>
    <button className="tr-btn full" onClick={() => setFilter(EMPTY_FILTER)}>Clear filters</button>
  </div>;
}
