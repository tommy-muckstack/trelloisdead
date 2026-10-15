"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useBoards } from "@/components/BoardsProvider";
import { CardModal } from "@/components/CardModal";
import { BACKGROUNDS, LABELS, addCard, addList, checklistProgress, dueStatus, matches, moveCard, moveList, patchBoard, patchCard, renameList, setListArchived, type Card, type Filter, type LabelId, type List } from "@/lib/board";

const fmtDue = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
export function BoardView({ id }: { id: string }) {
  const { state, update } = useBoards(); const board = state.boards.find(b => b.id === id);
  const [open, setOpen] = useState<string | null>(null); const [filter, setFilter] = useState<Filter>({ q: "", label: null });
  const [dragCard, setDragCard] = useState<string | null>(null); const [dragList, setDragList] = useState<string | null>(null); const [over, setOver] = useState<{ list: string; index: number } | null>(null);
  const [adding, setAdding] = useState<string | null>(null); const [newList, setNewList] = useState(""); const [menu, setMenu] = useState(false); const [showArchive, setShowArchive] = useState(false);
  const bg = useMemo(() => BACKGROUNDS.find(b => b.id === board?.bg)?.css ?? BACKGROUNDS[0].css, [board?.bg]);
  const filtering = !!filter.q.trim() || !!filter.label;
  if (!board) return <main className="tr-home"><p>That board doesn't exist.</p><Link href="/app">Back to your boards</Link></main>;

  const cardIndexAt = (el: HTMLElement, y: number) => { const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-card-id]")).filter(c => c.dataset.cardId !== dragCard); let i = 0; for (const c of cards) { const r = c.getBoundingClientRect(); if (y > r.top + r.height / 2) i++; } return i; };
  const onListOver = (e: React.DragEvent<HTMLElement>, list: List) => { if (dragCard) { e.preventDefault(); const idx = cardIndexAt(e.currentTarget, e.clientY); if (over?.list !== list.id || over.index !== idx) setOver({ list: list.id, index: idx }); } else if (dragList && dragList !== list.id) e.preventDefault(); };
  const onListDrop = (e: React.DragEvent<HTMLElement>, list: List) => {
    e.preventDefault();
    if (dragCard) { const idx = cardIndexAt(e.currentTarget, e.clientY); // idx counts visible, non-dragged cards; archived cards are hidden, so map back to the full array
      const vis = list.cards.filter(c => !c.archived && c.id !== dragCard); const anchor = vis[idx]; const full = list.cards.filter(c => c.id !== dragCard); const at = anchor ? full.findIndex(c => c.id === anchor.id) : full.length;
      update(s => moveCard(s, board.id, dragCard, list.id, at)); }
    else if (dragList && dragList !== list.id) update(s => moveList(s, board.id, dragList, board.lists.findIndex(l => l.id === list.id)));
    setDragCard(null); setDragList(null); setOver(null); };
  const lists = board.lists.filter(l => !l.archived);
  const archivedCards = board.lists.flatMap(l => l.cards.filter(c => c.archived).map(c => ({ c, l })));
  const archivedLists = board.lists.filter(l => l.archived);

  return <div className="tr-board" style={{ background: bg }}>
    <div className="tr-bar">
      <Link href="/app" className="tr-bar__back" aria-label="All boards">← Boards</Link>
      <input className="tr-bar__title" aria-label="Board title" defaultValue={board.title} key={board.id + board.title} onBlur={e => update(s => patchBoard(s, board.id, { title: e.target.value }))} onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
      <div className="tr-bar__sp" />
      <input className="tr-bar__search" aria-label="Filter cards" placeholder="Filter cards" value={filter.q} onChange={e => setFilter({ ...filter, q: e.target.value })} />
      <div className="tr-lbls" role="group" aria-label="Filter by label">{LABELS.map(l => <button key={l.id} aria-label={`Filter label ${l.name}`} aria-pressed={filter.label === l.id} className={filter.label === l.id ? "on" : ""} style={{ background: l.color }} onClick={() => setFilter({ ...filter, label: filter.label === l.id ? null : (l.id as LabelId) })} />)}</div>
      <div className="tr-menu"><button className="tr-bar__btn" onClick={() => setMenu(m => !m)} aria-expanded={menu}>Background</button>
        {menu && <div className="tr-pop"><div className="tr-swatches">{BACKGROUNDS.map(b => <button key={b.id} aria-label={`Background ${b.name}`} className={board.bg === b.id ? "on" : ""} style={{ background: b.css }} onClick={() => { update(s => patchBoard(s, board.id, { bg: b.id })); setMenu(false); }} />)}</div></div>}</div>
      <button className="tr-bar__btn" onClick={() => setShowArchive(a => !a)} aria-expanded={showArchive}>Archive ({archivedCards.length + archivedLists.length})</button>
    </div>
    <div className="tr-lists" data-testid="lists">
      {lists.map(l => { const shown = l.cards.filter(c => !c.archived && matches(c, filter)); const hidden = l.cards.filter(c => !c.archived).length - shown.length;
        return <section key={l.id} className={"tr-list" + (dragList === l.id ? " drag" : "")} data-list-id={l.id} aria-label={l.title} onDragOver={e => onListOver(e, l)} onDrop={e => onListDrop(e, l)}>
          <header className="tr-list__hd" draggable onDragStart={e => { if ((e.target as HTMLElement).tagName === "INPUT") { e.preventDefault(); return; } e.dataTransfer.setData("text/plain", l.id); setDragList(l.id); }} onDragEnd={() => { setDragList(null); setOver(null); }}>
            <input aria-label="List title" defaultValue={l.title} key={l.id + l.title} onBlur={e => update(s => renameList(s, board.id, l.id, e.target.value || l.title))} onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
            <span className="tr-count">{shown.length}</span>
            <button aria-label={`Archive list ${l.title}`} title="Archive list" onClick={() => update(s => setListArchived(s, board.id, l.id, true))}>⋯</button></header>
          <div className="tr-cards">
            {shown.map((c, i) => <div key={c.id}>{over?.list === l.id && over.index === i && dragCard && dragCard !== c.id && <div className="tr-drop" />}<CardTile card={c} dragging={dragCard === c.id} onOpen={() => setOpen(c.id)} onDragStart={() => setDragCard(c.id)} onDragEnd={() => { setDragCard(null); setOver(null); }} /></div>)}
            {over?.list === l.id && dragCard && over.index >= shown.filter(c => c.id !== dragCard).length && <div className="tr-drop" />}
            {hidden > 0 && <p className="tr-hidden">{hidden} hidden by filter</p>}
          </div>
          {adding === l.id ? <AddCard onAdd={t => update(s => addCard(s, board.id, l.id, t))} onClose={() => setAdding(null)} /> : <button className="tr-addcard" onClick={() => setAdding(l.id)}>+ Add a card</button>}
        </section>; })}
      <form className="tr-list tr-list--new" onSubmit={e => { e.preventDefault(); if (newList.trim()) { update(s => addList(s, board.id, newList)); setNewList(""); } }}>
        <input aria-label="New list title" className="ids-input" placeholder="+ Add another list" value={newList} onChange={e => setNewList(e.target.value)} maxLength={200} />
        {newList.trim() && <button className="ids-btn ids-btn--primary ids-btn--sm" style={{ marginTop: 8 }}>Add list</button>}</form>
    </div>
    {showArchive && <aside className="tr-archive" aria-label="Archived items"><div className="tr-archive__hd"><b>Archived</b><button className="tr-bar__btn dark" onClick={() => setShowArchive(false)}>Close</button></div>
      {archivedLists.length + archivedCards.length === 0 && <p className="ids-muted">Nothing archived.</p>}
      {archivedLists.map(l => <div key={l.id} className="tr-arch-row"><span>List: {l.title}</span><button className="iconbtn" onClick={() => update(s => setListArchived(s, board.id, l.id, false))}>Restore</button></div>)}
      {archivedCards.map(({ c, l }) => <div key={c.id} className="tr-arch-row"><span>{c.title} <small className="ids-muted">in {l.title}</small></span><button className="iconbtn" onClick={() => update(s => patchCard(s, board.id, c.id, { archived: false }))}>Restore</button></div>)}</aside>}
    {open && <CardModal boardId={board.id} cardId={open} onClose={() => setOpen(null)} />}
    {filtering && <div className="tr-filtering">Filtering: dragging still works, hidden cards stay put. <button onClick={() => setFilter({ q: "", label: null })}>Clear</button></div>}
  </div>;
}

function AddCard({ onAdd, onClose }: { onAdd: (t: string) => void; onClose: () => void }) {
  const [t, setT] = useState(""); const ref = useRef<HTMLTextAreaElement>(null);
  const submit = () => { if (t.trim()) { onAdd(t); setT(""); ref.current?.focus(); } };
  return <div className="tr-compose"><textarea ref={ref} autoFocus aria-label="Card title" placeholder="Enter a title for this card…" value={t} maxLength={200} onChange={e => setT(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } if (e.key === "Escape") onClose(); }} />
    <div className="tb"><button className="ids-btn ids-btn--primary ids-btn--sm" onClick={submit}>Add card</button><button className="ids-btn ids-btn--ghost ids-btn--sm" onClick={onClose}>Cancel</button></div></div>;
}

function CardTile({ card, dragging, onOpen, onDragStart, onDragEnd }: { card: Card; dragging: boolean; onOpen: () => void; onDragStart: () => void; onDragEnd: () => void }) {
  const p = checklistProgress(card); const due = dueStatus(card);
  return <article className={"tr-card" + (dragging ? " drag" : "")} data-card-id={card.id} draggable onDragStart={e => { e.dataTransfer.setData("text/plain", card.id); onDragStart(); }} onDragEnd={onDragEnd} onClick={onOpen} role="button" tabIndex={0} aria-label={`Open card ${card.title}`} onKeyDown={e => { if (e.key === "Enter") onOpen(); }}>
    {card.labels.length > 0 && <div className="tr-card__lbls">{card.labels.map(l => <i key={l} title={l} style={{ background: LABELS.find(x => x.id === l)!.color }} />)}</div>}
    <div className="tr-card__t">{card.title}</div>
    {(card.due || p.total > 0 || card.desc) && <div className="tr-card__b">
      {card.due && <span className={"tr-badge due-" + due}>{due === "done" ? "✓ " : "◷ "}{fmtDue(card.due)}</span>}
      {card.desc && <span className="tr-badge" title="Has a description">≡</span>}
      {p.total > 0 && <span className={"tr-badge" + (p.done === p.total ? " due-done" : "")}>☑ {p.done}/{p.total}</span>}</div>}
  </article>;
}
