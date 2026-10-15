"use client";
import { useEffect, useState } from "react";
import { useBoards } from "@/components/BoardsProvider";
import { LABELS, addCheckItem, checklistProgress, copyCard, deleteCard, findCard, moveCard, patchCard, type LabelId } from "@/lib/board";
export function CardModal({ boardId, cardId, onClose }: { boardId: string; cardId: string; onClose: () => void }) {
  const { state, update } = useBoards(); const board = state.boards.find(b => b.id === boardId); const hit = board && findCard(board, cardId);
  const [title, setTitle] = useState(hit?.card.title ?? ""); const [desc, setDesc] = useState(hit?.card.desc ?? ""); const [item, setItem] = useState("");
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  if (!board || !hit) return null; const { card, list } = hit; const p = checklistProgress(card); const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
  const patch = (x: Parameters<typeof patchCard>[3]) => update(s => patchCard(s, boardId, cardId, x));
  const toggleLabel = (id: LabelId) => patch({ labels: card.labels.includes(id) ? card.labels.filter(l => l !== id) : [...card.labels, id] });
  const targets = board.lists.filter(l => !l.archived);
  return <div className="tr-modal" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="tr-modal__box" role="dialog" aria-modal="true" aria-label="Card details">
    <button className="tr-modal__x" aria-label="Close" onClick={onClose}>×</button>
    <input className="tr-modal__title" aria-label="Card title" value={title} maxLength={200} onChange={e => setTitle(e.target.value)} onBlur={() => patch({ title })} />
    <p className="ids-muted" style={{ margin: "2px 0 16px", fontSize: 13 }}>in list <b>{list.title}</b></p>
    <div className="tr-modal__cols"><div>
      <h4>Labels</h4><div className="tr-pick">{LABELS.map(l => <button key={l.id} aria-pressed={card.labels.includes(l.id)} aria-label={`Label ${l.name}`} className={card.labels.includes(l.id) ? "on" : ""} style={{ background: l.color }} onClick={() => toggleLabel(l.id)}>{card.labels.includes(l.id) ? "✓" : ""}{l.name}</button>)}</div>
      <h4>Description</h4><textarea aria-label="Description" className="ids-input tr-ta" placeholder="Add a more detailed description…" value={desc} maxLength={8000} onChange={e => setDesc(e.target.value)} onBlur={() => patch({ desc })} />
      <h4>Checklist {p.total > 0 && <span className="ids-muted">{pct}%</span>}</h4>
      {p.total > 0 && <div className="tr-prog" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: pct + "%" }} /></div>}
      <ul className="tr-check">{card.checklist.map(i => <li key={i.id}><label><input type="checkbox" checked={i.done} onChange={e => patch({ checklist: card.checklist.map(x => x.id === i.id ? { ...x, done: e.target.checked } : x) })} /><span className={i.done ? "done" : ""}>{i.text}</span></label>
        <button className="iconbtn" aria-label={`Delete ${i.text}`} onClick={() => patch({ checklist: card.checklist.filter(x => x.id !== i.id) })}>×</button></li>)}</ul>
      <form className="tb" onSubmit={e => { e.preventDefault(); if (item.trim()) { update(s => addCheckItem(s, boardId, cardId, item)); setItem(""); } }}><input className="ids-input" aria-label="New checklist item" placeholder="Add an item" value={item} onChange={e => setItem(e.target.value)} style={{ flex: 1 }} /><button className="ids-btn ids-btn--sm">Add</button></form>
    </div><div>
      <h4>Due date</h4><div className="tb"><input type="date" className="ids-input" aria-label="Due date" value={card.due ?? ""} onChange={e => patch({ due: e.target.value || null })} />{card.due && <button className="iconbtn" onClick={() => patch({ due: null })}>Clear</button>}</div>
      <h4>Move to list</h4><select className="ids-input" aria-label="Move to list" value={list.id} onChange={e => update(s => moveCard(s, boardId, cardId, e.target.value, 9999))}>{targets.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select>
      <h4>Actions</h4><div className="tr-actions"><button className="ids-btn ids-btn--outline ids-btn--sm" onClick={() => { update(s => copyCard(s, boardId, cardId)); onClose(); }}>Copy card</button>
        <button className="ids-btn ids-btn--outline ids-btn--sm" onClick={() => { patch({ archived: true }); onClose(); }}>Archive</button>
        <button className="ids-btn ids-btn--outline ids-btn--sm" style={{ color: "var(--ids-color-danger)" }} onClick={() => { if (confirm("Delete this card forever?")) { update(s => deleteCard(s, boardId, cardId)); onClose(); } }}>Delete</button></div>
    </div></div></div></div>;
}
