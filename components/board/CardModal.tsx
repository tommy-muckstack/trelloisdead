"use client";
// Card details (first version on the new data model): title, labels, description, checklists, due date, move, copy, archive, delete.
import { useEffect, useState } from "react";
import { findCard, progress, uid } from "@/lib/model";
import { useBoard } from "@/components/app/BoardProvider";

export function CardModal({ cardId, onClose }: { cardId: string; onClose: () => void }) {
  const { board, dispatch, editable } = useBoard(); const hit = findCard(board, cardId);
  const [title, setTitle] = useState(hit?.card.title ?? ""); const [desc, setDesc] = useState(hit?.card.desc ?? ""); const [item, setItem] = useState(""); const [confirmDel, setConfirmDel] = useState(false);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  if (!hit) return <div className="tr-scrim" onMouseDown={onClose}><div className="tr-dialog"><h2>Card not found</h2><p>It may have been deleted or moved to another board.</p><button className="tr-btn" onClick={onClose}>Close</button></div></div>;
  const { card, list } = hit; const p = progress(card); const pct = p.total ? Math.round((p.done / p.total) * 100) : 0; const cl = card.checklists[0];
  const addItem = (e: React.FormEvent) => { e.preventDefault(); if (!item.trim()) return; let id = cl?.id; if (!id) { id = uid("k"); dispatch({ t: "checklist.add", cardId, checklistId: id, title: "Checklist" }); } dispatch({ t: "item.add", cardId, checklistId: id, itemId: uid("i"), text: item }); setItem(""); };
  const dueLocal = card.due ? new Date(card.due).toISOString().slice(0, 10) : "";
  return <div className="tr-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="tr-dialog wide" role="dialog" aria-modal="true" aria-label="Card details">
    <button className="tr-x" aria-label="Close" onClick={onClose}>×</button>
    <input className="b-mtitle" aria-label="Card title" value={title} readOnly={!editable} onChange={e => setTitle(e.target.value)} onBlur={() => title.trim() && title !== card.title && dispatch({ t: "card.patch", cardId, patch: { title } })} />
    <p className="muted" style={{ margin: "0 0 12px" }}>in list <b>{list.title}</b></p>
    <h4 className="b-h4">Labels</h4><div className="b-pick">{board.labels.map(l => <button key={l.id} disabled={!editable} aria-pressed={card.labels.includes(l.id)} className={"b-label lc-" + l.color + (card.labels.includes(l.id) ? " on" : "")} onClick={() => dispatch({ t: "card.label", cardId, labelId: l.id, on: !card.labels.includes(l.id) })}>{card.labels.includes(l.id) ? "✓ " : ""}{l.name || l.color.replace("_", " ")}</button>)}</div>
    <h4 className="b-h4">Description</h4><textarea className="tr-in" aria-label="Description" readOnly={!editable} placeholder="Add a more detailed description…" value={desc} onChange={e => setDesc(e.target.value)} onBlur={() => desc !== card.desc && dispatch({ t: "card.patch", cardId, patch: { desc } })} />
    <h4 className="b-h4">Checklist {p.total > 0 && <span className="muted">{pct}%</span>}</h4>
    {card.checklists.flatMap(c => c.items.map(i => ({ c, i }))).map(({ c, i }) => <label key={i.id} className="tr-check" style={{ padding: "4px 0" }}><input type="checkbox" disabled={!editable} checked={i.done} onChange={e => dispatch({ t: "item.patch", cardId, checklistId: c.id, itemId: i.id, done: e.target.checked })} />{i.text}</label>)}
    {editable && <form onSubmit={addItem} style={{ display: "flex", gap: 8, marginTop: 6 }}><input className="tr-in" aria-label="New checklist item" placeholder="Add an item" value={item} onChange={e => setItem(e.target.value)} /><button className="tr-btn">Add</button></form>}
    <h4 className="b-h4">Due date</h4><input type="date" className="tr-in" style={{ maxWidth: 200 }} aria-label="Due date" disabled={!editable} value={dueLocal} onChange={e => dispatch({ t: "card.patch", cardId, patch: { due: e.target.value ? new Date(e.target.value + "T12:00:00").toISOString() : null } })} />
    {editable && <><h4 className="b-h4">Move to list</h4><select className="tr-in" style={{ maxWidth: 240 }} aria-label="Move to list" value={list.id} onChange={e => dispatch({ t: "card.move", cardId, listId: e.target.value, index: 1e6 })}>{board.lists.filter(l => !l.archived).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select>
      <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
        <button className="tr-btn" onClick={() => { dispatch({ t: "card.copy", cardId, newId: uid("c"), listId: list.id, index: hit.index + 1, title: card.title + " (copy)", keep: { labels: true, members: true, checklists: true, attachments: true, comments: false, dates: true } }); onClose(); }}>Copy card</button>
        <button className="tr-btn" onClick={() => { dispatch({ t: "card.patch", cardId, patch: { archived: true } }); onClose(); }}>Archive</button>
        {confirmDel ? <><button className="tr-btn danger" onClick={() => { dispatch({ t: "card.delete", cardId }, { undoable: false }); onClose(); }}>Delete forever</button><button className="tr-btn" onClick={() => setConfirmDel(false)}>Cancel</button></> : <button className="tr-btn" onClick={() => setConfirmDel(true)}>Delete</button>}
      </div></>}
  </div></div>;
}
