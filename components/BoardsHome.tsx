"use client";
import Link from "next/link";
import { useState } from "react";
import { useBoards } from "@/components/BoardsProvider";
import { BACKGROUNDS, addBoard, deleteBoard, mkBoard, mkList, type BgId } from "@/lib/board";
export function BoardsHome() {
  const { state, update } = useBoards(); const [creating, setCreating] = useState(false); const [title, setTitle] = useState(""); const [bg, setBg] = useState<BgId>("ocean");
  const bgOf = (id: BgId) => BACKGROUNDS.find(b => b.id === id)!.css;
  const create = (e: React.FormEvent) => { e.preventDefault(); if (!title.trim()) return; update(s => addBoard(s, mkBoard(title, bg, [mkList("To do"), mkList("Doing"), mkList("Done")]))); setTitle(""); setCreating(false); };
  return <main className="tr-home"><h1 className="ids-h2" style={{ marginBottom: 20 }}>Your boards</h1>
    <div className="tr-boards" data-testid="boards">
      {state.boards.map(b => <div key={b.id} className="tr-bcard" style={{ background: bgOf(b.bg) }}><Link href={`/app/b/${b.id}`} className="tr-bcard__lnk" aria-label={`Open ${b.title}`}><b>{b.title}</b><span>{b.lists.filter(l => !l.archived).length} lists · {b.lists.reduce((n, l) => n + l.cards.filter(c => !c.archived).length, 0)} cards</span></Link>
        <button className="tr-bcard__del" aria-label={`Delete ${b.title}`} onClick={() => { if (confirm(`Delete "${b.title}" and all its cards?`)) update(s => deleteBoard(s, b.id)); }}>×</button></div>)}
      {!creating ? <button className="tr-bcard tr-bcard--new" onClick={() => setCreating(true)}>+ Create new board</button>
        : <form className="tr-bcard tr-bcard--form" onSubmit={create} style={{ background: bgOf(bg) }}>
          <input autoFocus className="ids-input" aria-label="Board title" placeholder="Board title" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} />
          <div className="tr-swatches">{BACKGROUNDS.map(b => <button type="button" key={b.id} aria-label={`Background ${b.name}`} aria-pressed={bg === b.id} className={bg === b.id ? "on" : ""} style={{ background: b.css }} onClick={() => setBg(b.id)} />)}</div>
          <div className="tb"><button className="ids-btn ids-btn--primary ids-btn--sm" disabled={!title.trim()}>Create</button><button type="button" className="ids-btn ids-btn--sm" onClick={() => setCreating(false)}>Cancel</button></div></form>}
    </div></main>;
}
