"use client";
// The list "⋯" menu: add card, copy list, move list (this or another board), move all cards, sort,
// watch, archive all cards, archive list.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { uid, type Board, type List, type SortBy } from "@/lib/model";
import { useApp } from "@/components/app/AppProvider";
import { useBoard } from "@/components/app/BoardProvider";
import { PopHead, useDismiss } from "@/components/app/ui";

type View = "main" | "copy" | "move" | "moveCards" | "sort" | "archiveCards";
export function ListMenu({ list, onAddCard, extra }: { list: List; onAddCard: () => void; extra?: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false); const [view, setView] = useState<View>("main"); const ref = useRef<HTMLDivElement>(null);
  const close = () => { setOpen(false); setView("main"); }; useDismiss(ref, close, open);
  const { board, dispatch, me } = useBoard(); const watching = list.watchers.includes(me);
  const titles: Record<View, string> = { main: "List actions", copy: "Copy list", move: "Move list", moveCards: "Move all cards in list", sort: "Sort list", archiveCards: "Archive all cards in this list?" };
  const back = view === "main" ? undefined : () => setView("main");
  return <div className="tr-dd b-lm" ref={ref}>
    <button className="b-list__menu" aria-label={`List actions for ${list.title}`} aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>⋯</button>
    {open && <div className="tr-pop" role="menu" aria-label="List actions" data-testid="list-menu">
      <PopHead title={titles[view]} onClose={close} onBack={back} />
      {view === "main" && <>
        <button className="tr-mi" onClick={() => { close(); onAddCard(); }}>Add card</button>
        <button className="tr-mi" onClick={() => setView("copy")}>Copy list</button>
        <button className="tr-mi" onClick={() => setView("move")}>Move list</button>
        <button className="tr-mi" onClick={() => setView("moveCards")}>Move all cards in this list</button>
        <button className="tr-mi" onClick={() => setView("sort")}>Sort by…</button>
        <button className="tr-mi" role="menuitemcheckbox" aria-checked={watching} onClick={() => { dispatch({ t: "list.watch", listId: list.id, on: !watching }); close(); }}>Watch{watching && <Eye size={14} className="end" />}</button>
        {extra?.(close)}
        <hr className="tr-sep" />
        <button className="tr-mi" onClick={() => { dispatch({ t: "list.patch", listId: list.id, archived: true }); close(); }}>Archive this list</button>
        <button className="tr-mi" onClick={() => setView("archiveCards")}>Archive all cards in this list</button>
      </>}
      {view === "copy" && <CopyList list={list} onDone={close} />}
      {view === "move" && <MoveList list={list} board={board} onDone={close} />}
      {view === "moveCards" && <>{board.lists.filter(l => !l.archived).map(l => <button key={l.id} className="tr-mi" disabled={l.id === list.id} onClick={() => { dispatch({ t: "list.moveCards", listId: list.id, toListId: l.id }); close(); }}>{l.title}{l.id === list.id && <span className="end">(current)</span>}</button>)}</>}
      {view === "sort" && <>{([["newest", "Date created (newest first)"], ["oldest", "Date created (oldest first)"], ["title", "Card name (alphabetically)"], ["due", "Due date"], ...(board.powerUps.includes("voting") ? [["votes", "Votes (most first)"]] : [])] as [SortBy, string][]).map(([by, l]) => <button key={by} className="tr-mi" onClick={() => { dispatch({ t: "list.sort", listId: list.id, sortBy: by }); close(); }}>{l}</button>)}</>}
      {view === "archiveCards" && <><p style={{ marginTop: 0 }}>This will remove all the cards in this list from the board. To view archived cards and bring them back to the board, click “Menu” &gt; “Archived items”.</p><button className="tr-btn danger full" onClick={() => { dispatch({ t: "list.archiveCards", listId: list.id }); close(); }}>Archive all</button></>}
    </div>}
  </div>;
}
function CopyList({ list, onDone }: { list: List; onDone: () => void }) {
  const { dispatch } = useBoard(); const [t, setT] = useState(list.title);
  return <form onSubmit={e => { e.preventDefault(); dispatch({ t: "list.copy", listId: list.id, newId: uid("l"), title: t.trim() || list.title }); onDone(); }}>
    <label className="tr-lbl" htmlFor="cl-name" style={{ marginTop: 0 }}>Name</label><textarea id="cl-name" className="tr-in" autoFocus value={t} onChange={e => setT(e.target.value)} style={{ minHeight: 60 }} />
    <button className="tr-btn primary" style={{ marginTop: 8 }}>Create list</button></form>;
}
function MoveList({ list, board, onDone }: { list: List; board: Board; onDone: () => void }) {
  const app = useApp(); const { dispatch, reload } = useBoard(); const router = useRouter();
  const targets = app.boards.filter(b => !b.closed && (b.role === "admin" || b.role === "normal")); const [to, setTo] = useState(board.id); const [count, setCount] = useState(board.lists.filter(l => !l.archived).length);
  const cur = board.lists.filter(l => !l.archived).findIndex(l => l.id === list.id); const [pos, setPos] = useState(cur);
  useEffect(() => { if (to === board.id) { setCount(board.lists.filter(l => !l.archived).length); setPos(cur); return; } app.call<{ board: Board }>("GET", `/api/b/${to}`).then(r => { const n = r.board.lists.filter(l => !l.archived).length + 1; setCount(n); setPos(n - 1); }).catch(() => setCount(1)); }, [to]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    if (to === board.id) { const visible = board.lists.filter(l => !l.archived && l.id !== list.id); const anchor = visible[pos]; const full = board.lists.filter(l => l.id !== list.id); dispatch({ t: "list.move", listId: list.id, index: anchor ? full.findIndex(l => l.id === anchor.id) : full.length }); onDone(); return; }
    try { await app.call("POST", "/api/transfer", { kind: "list", copy: false, fromBoard: board.id, itemId: list.id, toBoard: to, index: pos }); onDone(); await reload(); const dest = app.boards.find(b => b.id === to); app.toast(`Moved “${list.title}” to ${dest?.title ?? "the other board"}.`, { action: { label: "Open", run: () => router.push(`/app/b/${to}`) } }); }
    catch (err) { app.toast((err as Error).message, { kind: "error" }); }
  };
  return <form onSubmit={go}>
    <label className="tr-lbl" htmlFor="ml-board" style={{ marginTop: 0 }}>Board</label><select id="ml-board" className="tr-in" value={to} onChange={e => setTo(e.target.value)}>{targets.map(b => <option key={b.id} value={b.id}>{b.title}{b.id === board.id ? " (current)" : ""}</option>)}</select>
    <label className="tr-lbl" htmlFor="ml-pos">Position</label><select id="ml-pos" className="tr-in" value={pos} onChange={e => setPos(Number(e.target.value))}>{Array.from({ length: Math.max(1, count) }, (_, i) => <option key={i} value={i}>{i + 1}{to === board.id && i === cur ? " (current)" : ""}</option>)}</select>
    <button className="tr-btn primary" style={{ marginTop: 12 }}>Move</button></form>;
}
