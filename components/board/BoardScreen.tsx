"use client";
// The board: header bar, lists with drag and drop, and the card dialog (opened with ?card=<id>, so cards have links).
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Star, Archive, Image as ImageIcon } from "lucide-react";
import { bgCss, uid, type Board, type Card, type List, type Role } from "@/lib/model";
import { EMPTY_FILTER, isFiltering, matches, type Filter } from "@/lib/filter";
import { useApp } from "@/components/app/AppProvider";
import { BoardProvider, SaveState, useBoard } from "@/components/app/BoardProvider";
import { useDismiss } from "@/components/app/ui";
import { BackgroundPicker } from "@/components/app/CreateBoard";
import { CardTile } from "@/components/board/CardTile";
import { CardModal } from "@/components/board/CardModal";
import "./board.css";

export function BoardScreen({ initial, role, via }: { initial: Board; role: Role | null; via: "member" | "workspace" | "public" }) {
  return <BoardProvider key={initial.id} initial={initial} role={role} via={via}><BoardBody /></BoardProvider>;
}

function BoardBody() {
  const { board, dispatch, editable } = useBoard(); const app = useApp(); const router = useRouter(); const sp = useSearchParams();
  const openCard = sp.get("card"); const [filter, setFilter] = useState<Filter>(EMPTY_FILTER);
  const setOpen = useCallback((id: string | null) => { const q = new URLSearchParams(sp.toString()); if (id) q.set("card", id); else q.delete("card"); router.replace(`/app/b/${board.id}${q.size ? "?" + q : ""}`, { scroll: false }); }, [router, sp, board.id]);
  useEffect(() => { void app.patchMe({ viewed: board.id }); }, [board.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { document.title = `${board.title} | TrelloIsDead`; }, [board.title]);
  const lists = board.lists.filter(l => !l.archived);
  return <div className="b-root" style={{ background: bgCss(board.bg) }} data-board={board.id}>
    <BoardBar filter={filter} setFilter={setFilter} />
    {board.closed && <div className="b-closed">This board is closed. {editable || board.members.find(m => m.id === app.user.id)?.role === "admin" ? <button className="tr-btn sm" onClick={() => dispatch({ t: "board.patch", patch: { closed: false } })}>Reopen board</button> : "Ask a board admin to reopen it."}</div>}
    <Lists lists={lists} filter={filter} onOpen={setOpen} />
    {openCard && <CardModal cardId={openCard} onClose={() => setOpen(null)} />}
    {isFiltering(filter) && <div className="b-filtering">Filtering is on. <button onClick={() => setFilter(EMPTY_FILTER)}>Clear</button></div>}
  </div>;
}

function BoardBar({ filter, setFilter }: { filter: Filter; setFilter: (f: Filter) => void }) {
  const { board, dispatch, editable, me } = useBoard(); const app = useApp(); const star = app.starred(board.id);
  const [bgOpen, setBgOpen] = useState(false); const bgRef = useRef<HTMLDivElement>(null); useDismiss(bgRef, () => setBgOpen(false), bgOpen);
  const [arch, setArch] = useState(false);
  const archivedCards = board.lists.flatMap(l => l.cards.filter(c => c.archived).map(c => ({ c, l }))); const archivedLists = board.lists.filter(l => l.archived);
  return <div className="b-bar">
    <input className="b-title" aria-label="Board title" defaultValue={board.title} key={board.title} readOnly={!editable} onBlur={e => { if (e.target.value.trim() && e.target.value !== board.title) dispatch({ t: "board.patch", patch: { title: e.target.value } }); }} onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} size={Math.max(4, board.title.length)} />
    <button className="b-btn icon" aria-label={star ? "Unstar board" : "Star board"} aria-pressed={star} onClick={() => app.toggleStar(board.id)}><Star size={16} fill={star ? "#f5cd47" : "none"} color={star ? "#f5cd47" : "currentColor"} /></button>
    <span className="b-sp" />
    <input className="b-search" aria-label="Filter cards" placeholder="Filter cards" value={filter.q} onChange={e => setFilter({ ...filter, q: e.target.value })} />
    <div className="b-lbls" role="group" aria-label="Filter by label">{board.labels.slice(0, 6).map(l => <button key={l.id} aria-label={`Filter label ${l.name || l.color}`} aria-pressed={filter.labels.includes(l.id)} className={"lc-" + l.color + (filter.labels.includes(l.id) ? " on" : "")} onClick={() => setFilter({ ...filter, labels: filter.labels.includes(l.id) ? filter.labels.filter(x => x !== l.id) : [...filter.labels, l.id] })} />)}</div>
    {editable && <div className="tr-dd" ref={bgRef}><button className="b-btn" aria-expanded={bgOpen} onClick={() => setBgOpen(o => !o)}><ImageIcon size={16} />Background</button>
      {bgOpen && <div className="tr-pop right"><h6>Change background</h6><BackgroundPicker value={board.bg} boardId={board.id} onPick={bg => dispatch({ t: "board.patch", patch: { bg } })} /></div>}</div>}
    <button className="b-btn" aria-expanded={arch} onClick={() => setArch(a => !a)}><Archive size={16} />Archive ({archivedCards.length + archivedLists.length})</button>
    <SaveState />
    {arch && <aside className="b-panel" aria-label="Archived items"><div className="b-panel__hd"><b>Archived items</b><button className="tr-btn sm" onClick={() => setArch(false)}>Close</button></div>
      {archivedLists.length + archivedCards.length === 0 && <p className="muted">Nothing archived.</p>}
      {archivedLists.map(l => <div key={l.id} className="b-arch"><span>List: {l.title}</span>{editable && <button className="tr-btn sm" onClick={() => dispatch({ t: "list.patch", listId: l.id, archived: false })}>Restore</button>}</div>)}
      {archivedCards.map(({ c, l }) => <div key={c.id} className="b-arch"><span>{c.title} <small className="muted">in {l.title}</small></span>{editable && <button className="tr-btn sm" onClick={() => dispatch({ t: "card.patch", cardId: c.id, patch: { archived: false } })}>Restore</button>}</div>)}
    </aside>}
    <span hidden>{me}</span>
  </div>;
}

/** Lists + drag and drop. Cards: native HTML5 drag; drop index counts visible cards and maps back to the full array. */
function Lists({ lists, filter, onOpen }: { lists: List[]; filter: Filter; onOpen: (id: string) => void }) {
  const { board, dispatch, editable, me } = useBoard();
  const [dragCard, setDragCard] = useState<string | null>(null); const [dragList, setDragList] = useState<string | null>(null); const [over, setOver] = useState<{ list: string; index: number } | null>(null);
  const [adding, setAdding] = useState<string | null>(null); const [newList, setNewList] = useState(""); const [listForm, setListForm] = useState(false);
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
      return <section key={l.id} className={"b-list" + (dragList === l.id ? " drag" : "")} data-list-id={l.id} aria-label={l.title} onDragOver={e => onOver(e, l)} onDrop={e => onDrop(e, l)}>
        <header className="b-list__hd" draggable={editable} onDragStart={e => { if ((e.target as HTMLElement).closest("input,button")) { e.preventDefault(); return; } e.dataTransfer.setData("text/plain", l.id); setDragList(l.id); }} onDragEnd={() => { setDragList(null); setOver(null); }}>
          <input aria-label="List title" defaultValue={l.title} key={l.title} readOnly={!editable} onBlur={e => { if (e.target.value.trim() && e.target.value !== l.title) dispatch({ t: "list.patch", listId: l.id, title: e.target.value }); }} onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
          {editable && <button className="b-list__menu" aria-label={`Archive list ${l.title}`} title="Archive this list" onClick={() => dispatch({ t: "list.patch", listId: l.id, archived: true })}>⋯</button>}
        </header>
        <div className="b-cards">
          {shown.map((c, i) => <div key={c.id}>{over?.list === l.id && over.index === i && dragCard !== c.id && <div className="b-drop" />}<CardTile card={c} dragging={dragCard === c.id} draggable={editable} onOpen={() => onOpen(c.id)} onDragStart={() => setDragCard(c.id)} onDragEnd={() => { setDragCard(null); setOver(null); }} /></div>)}
          {over?.list === l.id && dragCard && over.index >= shown.filter(c => c.id !== dragCard).length && <div className="b-drop" />}
          {hidden > 0 && <p className="b-hidden">{hidden} card{hidden === 1 ? "" : "s"} hidden by the filter</p>}
          {adding === l.id && <AddCard onAdd={t => dispatch({ t: "card.add", listId: l.id, cardId: uid("c"), title: t, index: 1e6 })} onClose={() => setAdding(null)} />}
        </div>
        {editable && adding !== l.id && <button className="b-add" onClick={() => setAdding(l.id)}>+ Add a card</button>}
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
export type { Card };
export const useBoardMemo = () => { const b = useBoard(); return useMemo(() => b, [b]); };
