"use client";
// Board views besides the kanban: Table, Calendar, Timeline, Dashboard and Map. All respect the board filter
// and open cards through ?card=<id>.
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, ArrowUpDown } from "lucide-react";
import { allCards, dueStatus, fmtDate, labelColor, uid, type Card, type List } from "@/lib/model";
import { matches, type Filter } from "@/lib/filter";
import { useBoard } from "@/components/app/BoardProvider";
import { Avatar } from "@/components/app/ui";
import { localDate, localTime } from "@/components/card/pops";
import "./views.css";
import "leaflet/dist/leaflet.css";

export type ViewId = "board" | "table" | "calendar" | "timeline" | "dashboard" | "map";
type Row = { card: Card; list: List };
function useRows(filter: Filter): Row[] {
  const { board, me } = useBoard();
  return useMemo(() => allCards(board).filter(r => matches(r.card, filter, { me, board })), [board, filter, me]);
}
const Labels = ({ card }: { card: Card }) => { const { board } = useBoard(); return <span className="v-lbls">{card.labels.map(id => board.labels.find(l => l.id === id)).filter(Boolean).map(l => <span key={l!.id} className={"b-label lc-" + l!.color} title={labelColor(l!.color).name}>{l!.name}</span>)}</span>; };
const Due = ({ card }: { card: Card }) => card.due ? <span className={"b-badge due " + dueStatus(card)}>{fmtDate(card.due, { time: true })}</span> : <span className="muted">—</span>;

// ---------------------------------------------------------------- Table
type SortKey = "title" | "list" | "due" | "members" | "labels";
export function TableView({ filter, onOpen }: { filter: Filter; onOpen: (id: string) => void }) {
  const { board, dispatch, editable } = useBoard(); const rows = useRows(filter); const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "list", dir: 1 }); const [adding, setAdding] = useState(""); const [addList, setAddList] = useState(board.lists.find(l => !l.archived)?.id ?? "");
  const listIndex = (id: string) => board.lists.findIndex(l => l.id === id);
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const k = sort.k; let x = 0;
    if (k === "title") x = a.card.title.localeCompare(b.card.title); else if (k === "list") x = listIndex(a.list.id) - listIndex(b.list.id) || a.list.cards.indexOf(a.card) - b.list.cards.indexOf(b.card);
    else if (k === "due") x = (a.card.due ? Date.parse(a.card.due) : Infinity) - (b.card.due ? Date.parse(b.card.due) : Infinity); else if (k === "members") x = b.card.members.length - a.card.members.length; else x = b.card.labels.length - a.card.labels.length;
    return x * sort.dir; }), [rows, sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const th = (k: SortKey, l: string) => <th><button className="v-th" onClick={() => setSort(s => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : 1 }))} aria-label={`Sort by ${l}`}>{l}<ArrowUpDown size={12} />{sort.k === k ? (sort.dir === 1 ? " ↑" : " ↓") : ""}</button></th>;
  return <div className="v-wrap" data-testid="view-table"><div className="v-panel">
    <table className="tr-table v-table"><thead><tr>{th("title", "Card")}{th("list", "List")}{th("labels", "Labels")}{th("members", "Members")}{th("due", "Due date")}</tr></thead>
      <tbody>{sorted.map(({ card, list }) => <tr key={card.id} data-row={card.id}>
        <td><button className="v-cardlink" onClick={() => onOpen(card.id)}>{card.dueComplete ? "✓ " : ""}{card.title}</button></td>
        <td>{editable ? <select className="tr-in v-sel" aria-label={`List for ${card.title}`} value={list.id} onChange={e => dispatch({ t: "card.move", cardId: card.id, listId: e.target.value, index: 1e6 })}>{board.lists.filter(l => !l.archived).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select> : list.title}</td>
        <td><Labels card={card} /></td>
        <td><span style={{ display: "flex", gap: 2 }}>{card.members.map(id => board.members.find(m => m.id === id)).filter(Boolean).map(m => <Avatar key={m!.id} p={m!} size="sm" />)}</span></td>
        <td><Due card={card} /></td></tr>)}</tbody></table>
    {!sorted.length && <p className="muted" style={{ padding: 16 }}>No cards{filter.q || filter.labels.length ? " match the filter" : ""}.</p>}
    {editable && <form className="v-addrow" onSubmit={e => { e.preventDefault(); if (adding.trim() && addList) { dispatch({ t: "card.add", listId: addList, cardId: uid("c"), title: adding, index: 1e6 }); setAdding(""); } }}>
      <Plus size={16} /><input className="tr-in" aria-label="New card title" placeholder="Add a card…" value={adding} onChange={e => setAdding(e.target.value)} /><select className="tr-in" aria-label="List for the new card" value={addList} onChange={e => setAddList(e.target.value)} style={{ width: 180 }}>{board.lists.filter(l => !l.archived).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select><button className="tr-btn primary" disabled={!adding.trim()}>Add</button></form>}
  </div></div>;
}

// ---------------------------------------------------------------- Calendar
const ymd = (d: Date) => localDate(d.toISOString());
export function CalendarView({ filter, onOpen }: { filter: Filter; onOpen: (id: string) => void }) {
  const { board, dispatch, editable } = useBoard(); const rows = useRows(filter); const [mode, setMode] = useState<"month" | "week">("month");
  const [anchor, setAnchor] = useState(() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; }); const [drag, setDrag] = useState<string | null>(null); const [adding, setAdding] = useState<string | null>(null); const [t, setT] = useState("");
  const days = useMemo(() => { const start = new Date(anchor); if (mode === "month") start.setDate(1); start.setDate(start.getDate() - start.getDay()); const n = mode === "month" ? 42 : 7; return Array.from({ length: n }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; }); }, [anchor, mode]);
  const byDay = useMemo(() => { const m = new Map<string, Row[]>(); for (const r of rows) if (r.card.due) { const k = localDate(r.card.due); m.set(k, [...(m.get(k) ?? []), r]); } return m; }, [rows]);
  const shift = (n: number) => setAnchor(a => { const d = new Date(a); if (mode === "month") d.setMonth(d.getMonth() + n); else d.setDate(d.getDate() + 7 * n); return d; });
  const today = ymd(new Date()); const firstList = board.lists.find(l => !l.archived);
  const drop = (day: Date) => { if (!drag) return; const r = rows.find(x => x.card.id === drag); if (!r) return; const time = r.card.due ? localTime(r.card.due) : "12:00"; dispatch({ t: "card.patch", cardId: drag, patch: { due: new Date(`${ymd(day)}T${time}:00`).toISOString() } }); setDrag(null); };
  const undated = rows.filter(r => !r.card.due).length;
  return <div className="v-wrap" data-testid="view-calendar"><div className="v-panel v-cal">
    <div className="v-toolbar"><button className="tr-btn sm" onClick={() => { const d = new Date(); d.setHours(12); setAnchor(d); }}>Today</button><button className="tr-ib" aria-label="Previous" onClick={() => shift(-1)}><ChevronLeft size={18} /></button><button className="tr-ib" aria-label="Next" onClick={() => shift(1)}><ChevronRight size={18} /></button>
      <h2 aria-live="polite">{anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2><span style={{ flex: 1 }} />
      <span className="muted" style={{ fontSize: 12 }}>{undated} card{undated === 1 ? "" : "s"} without a due date</span>
      <select className="tr-in v-sel" aria-label="Calendar range" value={mode} onChange={e => setMode(e.target.value as typeof mode)}><option value="month">Month</option><option value="week">Week</option></select></div>
    <div className="v-calgrid" role="grid">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} className="v-dow" role="columnheader">{d}</div>)}
      {days.map(d => { const k = ymd(d); const items = byDay.get(k) ?? []; const other = mode === "month" && d.getMonth() !== anchor.getMonth();
        return <div key={k} role="gridcell" data-day={k} className={"v-day" + (other ? " other" : "") + (k === today ? " today" : "") + (mode === "week" ? " tall" : "")} onDragOver={e => { if (drag) e.preventDefault(); }} onDrop={e => { e.preventDefault(); drop(d); }}>
          <div className="v-dayhd"><span>{d.getDate()}</span>{editable && firstList && <button className="v-dayadd" aria-label={`Add a card due ${k}`} onClick={() => { setAdding(k); setT(""); }}><Plus size={14} /></button>}</div>
          {items.map(({ card }) => <button key={card.id} className={"v-calcard due-" + dueStatus(card)} draggable={editable} onDragStart={e => { e.dataTransfer.setData("text/plain", card.id); setDrag(card.id); }} onDragEnd={() => setDrag(null)} onClick={() => onOpen(card.id)} title={card.title}>{card.labels[0] && <i className={"lc-" + board.labels.find(l => l.id === card.labels[0])?.color} />}{card.title}</button>)}
          {adding === k && <form onSubmit={e => { e.preventDefault(); if (t.trim() && firstList) { const id = uid("c"); dispatch({ t: "card.add", listId: firstList.id, cardId: id, title: t, index: 1e6 }); dispatch({ t: "card.patch", cardId: id, patch: { due: new Date(`${k}T12:00:00`).toISOString() } }); setAdding(null); } }}><input className="tr-in" autoFocus aria-label="New card title" placeholder={`Card in ${firstList?.title}`} value={t} onChange={e => setT(e.target.value)} onKeyDown={e => { if (e.key === "Escape") setAdding(null); }} onBlur={() => !t && setAdding(null)} style={{ height: 28, fontSize: 12 }} /></form>}
        </div>; })}
    </div></div></div>;
}

// ---------------------------------------------------------------- Timeline
export function TimelineView({ filter, onOpen }: { filter: Filter; onOpen: (id: string) => void }) {
  const { board, dispatch, editable } = useBoard(); const rows = useRows(filter); const [zoom, setZoom] = useState<"week" | "month" | "quarter">("month");
  const W = zoom === "week" ? 96 : zoom === "month" ? 36 : 14; const span = zoom === "week" ? 14 : zoom === "month" ? 42 : 120;
  const [start, setStart] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 7); return d; });
  const days = Array.from({ length: span }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const dayIdx = (iso: string) => Math.floor((new Date(iso.length === 10 ? iso + "T12:00:00" : iso).getTime() - start.getTime()) / 864e5);
  const dragRef = useRef<{ id: string; x: number; moved: number } | null>(null); const [preview, setPreview] = useState<{ id: string; delta: number } | null>(null);
  const shiftDates = (c: Card, delta: number) => { if (!delta) return; const sh = (iso: string) => { const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso); d.setDate(d.getDate() + delta); return d; };
    dispatch({ t: "card.patch", cardId: c.id, patch: { ...(c.start ? { start: localDate(sh(c.start).toISOString()) } : {}), ...(c.due ? { due: sh(c.due).toISOString() } : {}) } }); };
  useEffect(() => {
    const mv = (e: PointerEvent) => { const d = dragRef.current; if (!d) return; const delta = Math.round((e.clientX - d.x) / W); d.moved = delta; setPreview({ id: d.id, delta }); };
    const up = () => { const d = dragRef.current; if (!d) return; dragRef.current = null; setPreview(null); const c = rows.find(r => r.card.id === d.id)?.card; if (c && d.moved) shiftDates(c, d.moved); else if (c) onOpen(c.id); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up); return () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
  }); // re-bind with fresh rows each render
  const lists = board.lists.filter(l => !l.archived); const undated = rows.filter(r => !r.card.due && !r.card.start);
  const todayIdx = dayIdx(new Date().toISOString());
  return <div className="v-wrap" data-testid="view-timeline"><div className="v-panel v-tl">
    <div className="v-toolbar"><button className="tr-btn sm" onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 7); setStart(d); }}>Today</button>
      <button className="tr-ib" aria-label="Earlier" onClick={() => setStart(s => { const d = new Date(s); d.setDate(d.getDate() - Math.round(span / 2)); return d; })}><ChevronLeft size={18} /></button><button className="tr-ib" aria-label="Later" onClick={() => setStart(s => { const d = new Date(s); d.setDate(d.getDate() + Math.round(span / 2)); return d; })}><ChevronRight size={18} /></button>
      <h2>{days[0]!.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {days[days.length - 1]!.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</h2><span style={{ flex: 1 }} />
      <select className="tr-in v-sel" aria-label="Zoom" value={zoom} onChange={e => setZoom(e.target.value as typeof zoom)}><option value="week">Day</option><option value="month">Week</option><option value="quarter">Month</option></select></div>
    <div className="v-tlscroll"><div style={{ width: 180 + span * W, position: "relative" }}>
      <div className="v-tlhead" style={{ paddingLeft: 180 }}>{days.map((d, i) => <div key={i} style={{ width: W }} className={d.getDay() === 0 || d.getDay() === 6 ? "we" : ""}>{zoom === "quarter" ? (d.getDate() === 1 ? d.toLocaleDateString("en-US", { month: "short" }) : "") : zoom === "month" ? (d.getDay() === 1 || i === 0 ? fmtDate(d.toISOString()) : "") : d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}</div>)}</div>
      {todayIdx >= 0 && todayIdx < span && <div className="v-today" style={{ left: 180 + todayIdx * W + W / 2 }} aria-hidden />}
      {lists.map(l => { const cards = rows.filter(r => r.list.id === l.id && (r.card.due || r.card.start));
        return <div key={l.id} className="v-tlgroup"><div className="v-tlname">{l.title} <span className="muted">{cards.length}</span></div>
          {cards.map(({ card }) => { const s0 = card.start ? dayIdx(card.start) : dayIdx(card.due!); const e0 = card.due ? dayIdx(card.due) : s0; const d = preview?.id === card.id ? preview.delta : 0; const s = Math.max(-1, s0 + d), e = Math.min(span, e0 + d);
            const visible = e >= 0 && s < span;
            return <div key={card.id} className="v-tlrow"><div className="v-tltitle" title={card.title}>{card.title}</div>
              {visible ? <div className={"v-bar due-" + dueStatus(card)} data-bar={card.id} style={{ left: 180 + Math.max(0, s) * W + 2, width: Math.max(W - 4, (Math.min(e, span - 1) - Math.max(0, s) + 1) * W - 4) }}
                onPointerDown={e2 => { if (!editable) { onOpen(card.id); return; } e2.preventDefault(); dragRef.current = { id: card.id, x: e2.clientX, moved: 0 }; }} role="button" tabIndex={0} aria-label={`${card.title}: ${card.start ? fmtDate(card.start) + " – " : ""}${card.due ? fmtDate(card.due) : ""}. Drag to reschedule`} onKeyDown={e2 => { if (e2.key === "Enter") onOpen(card.id); if (editable && e2.key === "ArrowRight") shiftDates(card, 1); if (editable && e2.key === "ArrowLeft") shiftDates(card, -1); }}>{card.title}</div>
                : <span className="v-offscreen">{s0 < 0 ? "← earlier" : "later →"}</span>}</div>; })}
        </div>; })}
    </div></div>
    {undated.length > 0 && <div className="v-undated"><b>{undated.length} card{undated.length === 1 ? "" : "s"} without dates</b><div>{undated.slice(0, 30).map(({ card }) => <button key={card.id} className="tr-pill" onClick={() => onOpen(card.id)}>{card.title}</button>)}</div></div>}
  </div></div>;
}

// ---------------------------------------------------------------- Dashboard
function Bars({ title, rows, testid }: { title: string; rows: { key: string; label: React.ReactNode; name: string; value: number; cls?: string }[]; testid: string }) {
  const max = Math.max(1, ...rows.map(r => r.value)); const total = rows.reduce((a, r) => a + r.value, 0);
  return <section className="v-tile" data-testid={testid} aria-label={title}><h3>{title}</h3>
    {rows.length ? <div className="v-bars" role="table" aria-label={title}>{rows.map(r => <div key={r.key} className="v-barrow" role="row" title={`${r.name}: ${r.value} card${r.value === 1 ? "" : "s"}${total ? ` (${Math.round((r.value / total) * 100)}%)` : ""}`}>
      <span className="v-barname" role="rowheader">{r.label}</span><span className="v-bartrack" role="cell" aria-label={`${r.value}`}><i className={r.cls ?? ""} style={{ width: `${(r.value / max) * 100}%` }} /></span><span className="v-barval">{r.value}</span></div>)}</div> : <p className="muted">No data.</p>}
  </section>;
}
export function DashboardView({ filter }: { filter: Filter }) {
  const { board } = useBoard(); const rows = useRows(filter);
  const perList = board.lists.filter(l => !l.archived).map(l => ({ key: l.id, label: l.title, name: l.title, value: rows.filter(r => r.list.id === l.id).length }));
  const status = (["complete", "soon", "later", "overdue", "none"] as const).map(s => ({ key: s, name: { complete: "Complete", soon: "Due soon", later: "Due later", overdue: "Overdue", none: "No due date" }[s], label: { complete: "✓ Complete", soon: "◷ Due soon", later: "◷ Due later", overdue: "! Overdue", none: "— No due date" }[s], value: rows.filter(r => dueStatus(r.card) === s).length, cls: "st-" + s }));
  const perMember = [...board.members.map(m => ({ key: m.id, name: m.name, label: <><Avatar p={m} size="sm" />{m.name}</>, value: rows.filter(r => r.card.members.includes(m.id)).length })), { key: "none", name: "Unassigned", label: "Unassigned", value: rows.filter(r => !r.card.members.length).length }];
  const perLabel = [...board.labels.map(l => ({ key: l.id, name: l.name || labelColor(l.color).name, label: <span className={"b-label lc-" + l.color}>{l.name || labelColor(l.color).name}</span>, value: rows.filter(r => r.card.labels.includes(l.id)).length })), { key: "none", name: "No label", label: "No label", value: rows.filter(r => !r.card.labels.length).length }];
  const done = rows.filter(r => r.card.dueComplete).length;
  return <div className="v-wrap" data-testid="view-dashboard"><div className="v-dash">
    <section className="v-tile v-hero"><h3>Cards on this board</h3><b>{rows.length}</b><span className="muted">{done} complete · {rows.filter(r => dueStatus(r.card) === "overdue").length} overdue</span></section>
    <Bars title="Cards per list" rows={perList} testid="dash-list" /><Bars title="Cards per due date" rows={status} testid="dash-due" />
    <Bars title="Cards per member" rows={perMember} testid="dash-member" /><Bars title="Cards per label" rows={perLabel} testid="dash-label" />
  </div></div>;
}

// ---------------------------------------------------------------- Map (OpenStreetMap tiles via Leaflet)
export function MapView({ filter, onOpen }: { filter: Filter; onOpen: (id: string) => void }) {
  const rows = useRows(filter); const placed = rows.filter(r => r.card.location); const el = useRef<HTMLDivElement>(null); const map = useRef<import("leaflet").Map | null>(null); const layer = useRef<import("leaflet").LayerGroup | null>(null);
  const openRef = useRef(onOpen); openRef.current = onOpen; const [tick, setTick] = useState(0);
  useEffect(() => { let dead = false; (async () => {
    const L = (await import("leaflet")).default; if (dead || !el.current || map.current) return;
    map.current = L.map(el.current, { worldCopyJump: true }).setView([20, 0], 2);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current); setTick(t => t + 1);
  })(); return () => { dead = true; map.current?.remove(); map.current = null; }; }, []);
  useEffect(() => { (async () => { if (!map.current || !layer.current) return; const L = (await import("leaflet")).default; layer.current.clearLayers(); const pts: [number, number][] = [];
    for (const { card } of placed) { const p = card.location!; pts.push([p.lat, p.lng]);
      const m = L.circleMarker([p.lat, p.lng], { radius: 9, color: "#fff", weight: 2, fillColor: "#0c66e4", fillOpacity: 1 }).addTo(layer.current); const div = document.createElement("div"); const b = document.createElement("button"); b.textContent = card.title; b.className = "v-mappop"; b.onclick = () => openRef.current(card.id); const s = document.createElement("small"); s.textContent = p.name; div.append(b, document.createElement("br"), s); m.bindPopup(div); m.bindTooltip(card.title); }
    if (pts.length) map.current.fitBounds(pts, { padding: [40, 40], maxZoom: 13 }); })(); }, [placed.map(r => r.card.id + r.card.location!.lat + r.card.location!.lng).join(), tick]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="v-wrap" data-testid="view-map"><div className="v-panel" style={{ padding: 0, overflow: "hidden" }}>
    <div ref={el} className="v-map" aria-label="Map of cards with a location" />
    <p className="muted" style={{ margin: 0, padding: "8px 12px", fontSize: 12 }}>{placed.length} card{placed.length === 1 ? "" : "s"} on the map. Add a location from a card&apos;s “Add” menu.</p>
  </div></div>;
}
