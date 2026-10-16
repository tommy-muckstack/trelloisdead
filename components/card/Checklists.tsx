"use client";
// Checklists on the card back: several named checklists, progress, hide checked items, per-item due date and
// assignee, convert an item to a card, delete.
import { useRef, useState } from "react";
import { CheckSquare, Clock, UserPlus, MoreHorizontal } from "lucide-react";
import { fmtDate, uid, type Card, type Checklist, type CheckItem } from "@/lib/model";
import { useBoard } from "@/components/app/BoardProvider";
import { Avatar, PopHead, useDismiss } from "@/components/app/ui";
import { localDate } from "@/components/card/pops";

function Pop({ label, title, className, children }: { label: React.ReactNode; title: string; className?: string; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null); useDismiss(ref, () => setOpen(false), open);
  return <div className="tr-dd" ref={ref}><button type="button" className={className} aria-label={title} title={title} aria-expanded={open} onClick={() => setOpen(o => !o)}>{label}</button>{open && <div className="tr-pop c-pop right">{children(() => setOpen(false))}</div>}</div>;
}
export function Checklists({ card }: { card: Card }) {
  return <>{card.checklists.map(cl => <ChecklistBlock key={cl.id} card={card} cl={cl} />)}</>;
}
function ChecklistBlock({ card, cl }: { card: Card; cl: Checklist }) {
  const { dispatch, editable } = useBoard(); const [hide, setHide] = useState(false); const [rename, setRename] = useState(false); const [title, setTitle] = useState(cl.title); const [adding, setAdding] = useState(false);
  const done = cl.items.filter(i => i.done).length; const pct = cl.items.length ? Math.round((done / cl.items.length) * 100) : 0;
  return <section className="c-sec" data-checklist={cl.id} aria-label={`Checklist ${cl.title}`}>
    <div className="c-sechd"><CheckSquare size={18} />
      {rename ? <form style={{ flex: 1 }} onSubmit={e => { e.preventDefault(); dispatch({ t: "checklist.rename", cardId: card.id, checklistId: cl.id, title }); setRename(false); }}><input className="tr-in" autoFocus aria-label="Checklist title" value={title} onChange={e => setTitle(e.target.value)} onBlur={() => { if (title.trim() && title !== cl.title) dispatch({ t: "checklist.rename", cardId: card.id, checklistId: cl.id, title }); setRename(false); }} /></form>
        : <h3 onClick={() => editable && setRename(true)}>{cl.title}</h3>}
      {done > 0 && <button className="tr-btn sm" onClick={() => setHide(h => !h)}>{hide ? `Show checked items (${done})` : "Hide checked items"}</button>}
      {editable && <Pop className="tr-btn sm" label="Delete" title={`Delete ${cl.title}`}>{close => <><PopHead title={`Delete ${cl.title}?`} onClose={close} /><p style={{ marginTop: 0 }}>Deleting a checklist is permanent and there is no way to get it back.</p><button className="tr-btn danger full" onClick={() => { dispatch({ t: "checklist.delete", cardId: card.id, checklistId: cl.id }, { undoable: false }); close(); }}>Delete checklist</button></>}</Pop>}
    </div>
    <div className="c-prog"><span>{pct}%</span><div role="progressbar" aria-label={`${cl.title} progress`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: pct + "%" }} className={pct === 100 ? "full" : ""} /></div></div>
    {hide && done === cl.items.length && cl.items.length > 0 && <p className="muted" style={{ margin: "4px 0 8px 40px", fontSize: 13 }}>Everything in this checklist is complete!</p>}
    <ul className="c-items">{cl.items.filter(i => !hide || !i.done).map(i => <Item key={i.id} card={card} cl={cl} item={i} />)}</ul>
    {editable && (adding ? <AddItem onAdd={t => dispatch({ t: "item.add", cardId: card.id, checklistId: cl.id, itemId: uid("i"), text: t })} onClose={() => setAdding(false)} /> : <button className="tr-btn sm" style={{ marginLeft: 40 }} onClick={() => setAdding(true)}>Add an item</button>)}
  </section>;
}
function AddItem({ onAdd, onClose }: { onAdd: (t: string) => void; onClose: () => void }) {
  const [t, setT] = useState("");
  return <form className="c-additem" onSubmit={e => { e.preventDefault(); if (t.trim()) { onAdd(t); setT(""); } }}>
    <textarea className="tr-in" autoFocus aria-label="Add an item" placeholder="Add an item" value={t} onChange={e => setT(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (t.trim()) { onAdd(t); setT(""); } } if (e.key === "Escape") { e.stopPropagation(); onClose(); } }} style={{ minHeight: 56 }} />
    <div style={{ display: "flex", gap: 8, marginTop: 6 }}><button className="tr-btn primary sm">Add</button><button type="button" className="tr-btn sm subtle" onClick={onClose}>Cancel</button></div></form>;
}
function Item({ card, cl, item }: { card: Card; cl: Checklist; item: CheckItem }) {
  const { board, dispatch, editable } = useBoard(); const [edit, setEdit] = useState(false); const [t, setT] = useState(item.text);
  const who = item.member ? board.members.find(m => m.id === item.member) : null;
  const patch = (p: Partial<{ text: string; done: boolean; due: string | null; member: string | null }>) => dispatch({ t: "item.patch", cardId: card.id, checklistId: cl.id, itemId: item.id, ...p });
  return <li className={"c-item" + (item.done ? " done" : "")}>
    <input type="checkbox" aria-label={item.text} checked={item.done} disabled={!editable} onChange={e => patch({ done: e.target.checked })} />
    {edit ? <form style={{ flex: 1 }} onSubmit={e => { e.preventDefault(); patch({ text: t }); setEdit(false); }}><textarea className="tr-in" autoFocus aria-label="Edit item" value={t} onChange={e => setT(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); patch({ text: t }); setEdit(false); } if (e.key === "Escape") { e.stopPropagation(); setEdit(false); setT(item.text); } }} style={{ minHeight: 48 }} />
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}><button className="tr-btn primary sm">Save</button><button type="button" className="tr-btn sm subtle" onClick={() => { setEdit(false); setT(item.text); }}>Cancel</button></div></form>
      : <span className="c-item__t" onClick={() => editable && setEdit(true)}>{item.text}</span>}
    {!edit && <span className="c-item__acts">
      {item.due && <span className="tr-pill">{fmtDate(item.due)}</span>}{who && <Avatar p={who} size="sm" />}
      {editable && <Pop className="tr-ib" title="Due date" label={<Clock size={14} />}>{close => <><PopHead title="Change due date" onClose={close} /><input type="date" className="tr-in" aria-label="Item due date" defaultValue={item.due ? localDate(item.due) : ""} onChange={e => { patch({ due: e.target.value ? new Date(e.target.value + "T12:00:00").toISOString() : null }); close(); }} />{item.due && <button className="tr-btn full" style={{ marginTop: 8 }} onClick={() => { patch({ due: null }); close(); }}>Remove</button>}</>}</Pop>}
      {editable && <Pop className="tr-ib" title="Assign" label={<UserPlus size={14} />}>{close => <><PopHead title="Assign" onClose={close} />{board.members.map(m => <button key={m.id} className="tr-mi" onClick={() => { patch({ member: item.member === m.id ? null : m.id }); close(); }}><Avatar p={m} size="sm" />{m.name}{item.member === m.id && <span className="end">✓</span>}</button>)}</>}</Pop>}
      {editable && <Pop className="tr-ib" title="Item actions" label={<MoreHorizontal size={14} />}>{close => <><PopHead title="Item actions" onClose={close} /><button className="tr-mi" onClick={() => { dispatch({ t: "item.toCard", cardId: card.id, checklistId: cl.id, itemId: item.id, newId: uid("c") }); close(); }}>Convert to card</button><button className="tr-mi danger" onClick={() => { dispatch({ t: "item.delete", cardId: card.id, checklistId: cl.id, itemId: item.id }, { undoable: false }); close(); }}>Delete</button></>}</Pop>}
    </span>}
  </li>;
}
