"use client";
// The board: header bar, lists with drag and drop, and the card dialog (opened with ?card=<id>, so cards have links).
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { bgCss, uid, type Board, type List, type Role } from "@/lib/model";
import { EMPTY_FILTER, isFiltering, matches, type Filter } from "@/lib/filter";
import { useApp } from "@/components/app/AppProvider";
import { BoardProvider, useBoard } from "@/components/app/BoardProvider";
import { useDismiss } from "@/components/app/ui";
import { BoardHeader } from "@/components/board/BoardHeader";
import type { MenuView } from "@/components/board/BoardMenu";
import { TableView, CalendarView, TimelineView, DashboardView, MapView, type ViewId } from "@/components/board/views/Views";
import { AutomationDialog, PowerUpsDialog } from "@/components/board/Automation";
import { useBoardShortcuts } from "@/components/board/useShortcuts";
import { CardTile } from "@/components/board/CardTile";
import { ListMenu } from "@/components/board/ListMenu";
import { Eye } from "lucide-react";
import { CardModal } from "@/components/card/CardModal";
import "./board.css";

export function BoardScreen({ initial, role, via }: { initial: Board; role: Role | null; via: "member" | "workspace" | "public" }) {
  return <BoardProvider key={initial.id} initial={initial} role={role} via={via}><BoardBody /></BoardProvider>;
}

function BoardBody() {
  const { board, dispatch, editable } = useBoard(); const app = useApp(); const router = useRouter(); const sp = useSearchParams();
  const openCard = sp.get("card"); const [filter, setFilter] = useState<Filter>(EMPTY_FILTER); const [filterOpen, setFilterOpen] = useState(false); const [menu, setMenu] = useState<MenuView | null>(null);
  const view = (["table", "calendar", "timeline", "dashboard", "map"].includes(sp.get("view") ?? "") ? sp.get("view") : "board") as ViewId;
  const setView = useCallback((v: ViewId) => { const q = new URLSearchParams(sp.toString()); if (v === "board") q.delete("view"); else q.set("view", v); router.replace(`/app/b/${board.id}${q.size ? "?" + q : ""}`, { scroll: false }); }, [router, sp, board.id]);
  const [pu, setPu] = useState(false); const [auto, setAuto] = useState<null | "rules" | "card" | "board">(null);
  const setOpen = useCallback((id: string | null) => { const q = new URLSearchParams(sp.toString()); if (id) q.set("card", id); else q.delete("card"); router.replace(`/app/b/${board.id}${q.size ? "?" + q : ""}`, { scroll: false }); }, [router, sp, board.id]);
  const [addAfter, setAddAfter] = useState<{ list: string; after: string } | null>(null);
  const sc = useBoardShortcuts({ filter, setFilter, setFilterOpen, menu, setMenu, onOpen: setOpen, addAfter: (list, after) => setAddAfter({ list, after }), active: !openCard && view === "board" });
  useEffect(() => { const h = (e: Event) => setAuto((e as CustomEvent).detail ?? "rules"); window.addEventListener("trelloisdead:automation", h); return () => window.removeEventListener("trelloisdead:automation", h); }, []);
  useEffect(() => { void app.patchMe({ viewed: board.id }); }, [board.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { document.title = `${board.title} | TrelloIsDead`; }, [board.title]);
  const lists = board.lists.filter(l => !l.archived);
  return <div className="b-root" style={{ background: bgCss(board.bg) }} data-board={board.id}>
    <BoardHeader filter={filter} setFilter={setFilter} filterOpen={filterOpen} setFilterOpen={setFilterOpen} menu={menu} setMenu={setMenu} view={view} setView={setView} onPowerUps={() => setPu(true)} onAutomation={() => setAuto("rules")} />
    {board.closed && <div className="b-closed">This board is closed. {editable || board.members.find(m => m.id === app.user.id)?.role === "admin" ? <button className="tr-btn sm" onClick={() => dispatch({ t: "board.patch", patch: { closed: false } })}>Reopen board</button> : "Ask a board admin to reopen it."}</div>}
    {view === "board" ? <Lists lists={lists} filter={filter} onOpen={setOpen} sel={sc.sel} addAfter={addAfter} setAddAfter={setAddAfter} /> : view === "table" ? <TableView filter={filter} onOpen={setOpen} /> : view === "calendar" ? <CalendarView filter={filter} onOpen={setOpen} /> : view === "timeline" ? <TimelineView filter={filter} onOpen={setOpen} /> : view === "dashboard" ? <DashboardView filter={filter} /> : <MapView filter={filter} onOpen={setOpen} />}
    {pu && <PowerUpsDialog onClose={() => setPu(false)} />}{auto && <AutomationDialog tab0={auto} onClose={() => setAuto(null)} />}
    {openCard && <CardModal key={openCard} cardId={openCard} onClose={() => setOpen(null)} onOpen={setOpen} />}
    {isFiltering(filter) && <div className="b-filtering">Filtering is on. <button onClick={() => setFilter(EMPTY_FILTER)}>Clear</button></div>}
  </div>;
}

/** Lists + drag and drop. Cards: native HTML5 drag; drop index counts visible cards and maps back to the full array. */
function Lists({ lists, filter, onOpen, sel, addAfter, setAddAfter }: { lists: List[]; filter: Filter; onOpen: (id: string) => void; sel: string | null; addAfter: { list: string; after: string } | null; setAddAfter: (v: { list: string; after: string } | null) => void }) {
  const { board, dispatch, editable, me } = useBoard();
  const [dragCard, setDragCard] = useState<string | null>(null); const [dragList, setDragList] = useState<string | null>(null); const [over, setOver] = useState<{ list: string; index: number } | null>(null);
  const [adding, setAdding] = useState<{ list: string; top: boolean } | null>(null); const topCount = useRef(0); const [newList, setNewList] = useState(""); const [listForm, setListForm] = useState(false);
  const shownOf = useCallback((l: List) => l.cards.filter(c => !c.archived && matches(c, filter, { me, board })), [filter, me, board]);
  const indexAt = (el: HTMLElement, y: number) => { const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-card-id]")).filter(c => c.dataset.cardId !== dragCard); let i = 0; for (const c of cards) { const r = c.getBoundingClientRect(); if (y > r.top + r.height / 2) i++; } return i; };
  const onOver = (e: React.DragEvent<HTMLElement>, l: List) => { if (dragCard) { e.preventDefault(); const i = indexAt(e.currentTarget, e.clientY); if (over?.list !== l.id || over.index !== i) setOver({ list: l.id, index: i }); } else if (dragList && dragList !== l.id) e.preventDefault(); };
  const onDrop = (e: React.DragEvent<HTMLElement>, l: List) => {
    e.preventDefault();
    if (dragCard) { const i = indexAt(e.currentTarget, e.clientY); const vis = shownOf(l).filter(c => c.id !== dragCard); const anchor = vis[i]; const full = l.cards.filter(c => c.id !== dragCard); dispatch({ t: "card.move", cardId: dragCard, listId: l.id, index: anchor ? full.findIndex(c => c.id === anchor.id) : full.length }); }
    else if (dragList && dragList !== l.id) dispatch({ t: "list.move", listId: dragList, index: board.lists.findIndex(x => x.id === l.id) });
    setDragCard(null); setDragList(null); setOver(null);
  };
  return <div className="b-canvas" data-testid="lists">
    {lists.map(l => { const shown = shownOf(l); const hidden = l.cards.filter(c => !c.archived).length - shown.length;
      const live = l.cards.filter(c => !c.archived).length; const limited = board.powerUps.includes("limits") && l.limit !== null;
      return <section key={l.id} className={"b-list" + (dragList === l.id ? " drag" : "") + (limited && live > l.limit! ? " over-limit" : "")} data-list-id={l.id} aria-label={l.title} onDragOver={e => onOver(e, l)} onDrop={e => onDrop(e, l)}>
        <header className="b-list__hd" draggable={editable} onDragStart={e => { if ((e.target as HTMLElement).closest("input,button,select,textarea,.tr-pop")) { e.preventDefault(); return; } e.dataTransfer.setData("text/plain", l.id); setDragList(l.id); }} onDragEnd={() => { setDragList(null); setOver(null); }}>
          <input aria-label="List title" defaultValue={l.title} key={l.title} readOnly={!editable} onBlur={e => { if (e.target.value.trim() && e.target.value !== l.title) dispatch({ t: "list.patch", listId: l.id, title: e.target.value }); }} onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
          {limited && <span className={"b-limit" + (live > l.limit! ? " over" : "")} title={`List limit: ${l.limit} cards`}>{live}/{l.limit}</span>}
          {l.watchers.includes(me) && <span className="b-watch" title="You are watching this list"><Eye size={14} /></span>}
          {editable && <ListMenu list={l} onAddCard={() => { topCount.current = 0; setAdding({ list: l.id, top: true }); }} extra={board.powerUps.includes("limits") ? close => <LimitItem list={l} close={close} /> : undefined} />}
        </header>
        <div className="b-cards">
          {adding?.list === l.id && adding.top && <AddCard onAdd={t => dispatch({ t: "card.add", listId: l.id, cardId: uid("c"), title: t, index: topCount.current++ })} onClose={() => setAdding(null)} />}
          {shown.map((c, i) => <div key={c.id}>{over?.list === l.id && over.index === i && dragCard !== c.id && <div className="b-drop" />}<CardTile card={c} selected={sel === c.id} dragging={dragCard === c.id} draggable={editable} onOpen={() => onOpen(c.id)} onDragStart={() => setDragCard(c.id)} onDragEnd={() => { setDragCard(null); setOver(null); }} />
            {addAfter?.after === c.id && <div style={{ marginTop: 8 }}><AddCard onAdd={t => { const id = uid("c"); const idx = l.cards.findIndex(x => x.id === addAfter.after); dispatch({ t: "card.add", listId: l.id, cardId: id, title: t, index: idx + 1 }); setAddAfter({ list: l.id, after: id }); }} onClose={() => setAddAfter(null)} /></div>}</div>)}
          {over?.list === l.id && dragCard && over.index >= shown.filter(c => c.id !== dragCard).length && <div className="b-drop" />}
          {hidden > 0 && <p className="b-hidden">{hidden} card{hidden === 1 ? "" : "s"} hidden by the filter</p>}
          {adding?.list === l.id && !adding.top && <AddCard onAdd={t => dispatch({ t: "card.add", listId: l.id, cardId: uid("c"), title: t, index: 1e6 })} onClose={() => setAdding(null)} />}
        </div>
        {editable && adding?.list !== l.id && <button className="b-add" onClick={() => setAdding({ list: l.id, top: false })}>+ Add a card</button>}
      </section>; })}
    {editable && (listForm ? <form className="b-list b-list--new" onSubmit={e => { e.preventDefault(); if (newList.trim()) { dispatch({ t: "list.add", listId: uid("l"), title: newList, index: 1e6 }); setNewList(""); } }}>
      <input autoFocus aria-label="Enter list name" className="tr-in" placeholder="Enter list name…" value={newList} onChange={e => setNewList(e.target.value)} maxLength={512} onKeyDown={e => { if (e.key === "Escape") setListForm(false); }} />
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}><button className="tr-btn primary sm">Add list</button><button type="button" className="tr-btn sm subtle" aria-label="Cancel" onClick={() => setListForm(false)}>×</button></div></form>
      : <button className="b-list b-list--add" onClick={() => setListForm(true)}>+ Add another list</button>)}
  </div>;
}

export function AddCard({ onAdd, onClose }: { onAdd: (t: string) => void; onClose: () => void }) {
  const [t, setT] = useState(""); const ref = useRef<HTMLTextAreaElement>(null); const wrap = useRef<HTMLDivElement>(null);
  const submit = () => { if (t.trim()) { onAdd(t); setT(""); ref.current?.focus(); } };
  useDismiss(wrap, () => { if (t.trim()) submit(); onClose(); });
  return <div className="b-compose" ref={wrap}><textarea ref={ref} autoFocus aria-label="Enter a title for this card" placeholder="Enter a title for this card…" value={t} maxLength={512} onChange={e => setT(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } if (e.key === "Escape") onClose(); }} />
    <div style={{ display: "flex", gap: 6 }}><button className="tr-btn primary sm" onClick={submit}>Add card</button><button className="tr-btn sm subtle" aria-label="Cancel" onClick={onClose}>×</button></div></div>;
}

function LimitItem({ list, close }: { list: List; close: () => void }) {
  const { dispatch } = useBoard(); const [v, setV] = useState(list.limit === null ? "" : String(list.limit)); const [edit, setEdit] = useState(false);
  if (!edit) return <button className="tr-mi" onClick={() => setEdit(true)}>Set list limit{list.limit !== null && <span className="end">{list.limit}</span>}</button>;
  return <form style={{ display: "flex", gap: 6, padding: "4px 0" }} onSubmit={e => { e.preventDefault(); const n = v.trim() === "" ? null : Math.max(0, Math.min(999, Math.floor(Number(v)))); dispatch({ t: "list.patch", listId: list.id, limit: Number.isFinite(n as number) ? n : null }); close(); }}>
    <input className="tr-in" type="number" min={0} max={999} autoFocus aria-label="List limit" placeholder="No limit" value={v} onChange={e => setV(e.target.value)} /><button className="tr-btn primary" style={{ height: 36 }}>Save</button></form>;
}
