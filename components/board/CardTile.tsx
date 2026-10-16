"use client";
// Front of a card: cover, labels (click to collapse or expand label text everywhere), title, and badges for
// watching, dates, description, comments, attachments, checklist, location, votes, custom fields and members.
import { useSyncExternalStore } from "react";
import { AlignLeft, CheckSquare, Clock, Eye, MessageSquare, Paperclip, MapPin, ThumbsUp, LayoutTemplate } from "lucide-react";
import { ageLevel, fmtDate, dueStatus, labelColor, progress, type Card } from "@/lib/model";
import { useBoard } from "@/components/app/BoardProvider";
import { Avatar } from "@/components/app/ui";

// label text shown or collapsed: a per-browser preference shared by every card (like Trello)
const KEY = "trelloisdead:labels-collapsed"; const subs = new Set<() => void>();
const readCollapsed = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };
export function useLabelsCollapsed() {
  const v = useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb); }, readCollapsed, () => false);
  const toggle = () => { try { localStorage.setItem(KEY, v ? "0" : "1"); } catch { /* private mode */ } subs.forEach(f => f()); };
  return [v, toggle] as const;
}
export function CardTile({ card, dragging, draggable, onOpen, onDragStart, onDragEnd, selected }: { card: Card; dragging: boolean; draggable: boolean; onOpen: () => void; onDragStart: () => void; onDragEnd: () => void; selected?: boolean }) {
  const { board, me, dispatch, editable } = useBoard(); const [collapsed, toggleLabels] = useLabelsCollapsed();
  const p = progress(card); const due = dueStatus(card); const pu = board.powerUps;
  const labels = card.labels.map(id => board.labels.find(l => l.id === id)).filter(Boolean);
  const members = card.members.map(id => board.members.find(m => m.id === id)).filter(Boolean);
  const coverAtt = board.settings.covers && card.cover?.attachmentId ? card.attachments.find(a => a.id === card.cover!.attachmentId) : null;
  const coverColor = board.settings.covers ? card.cover?.color ?? null : null; const full = !!(card.cover?.size === "full" && (coverAtt || coverColor));
  const front = pu.includes("fields") ? board.fields.filter(f => f.front && card.custom[f.id] !== undefined && card.custom[f.id] !== null) : [];
  const age = pu.includes("aging") ? ageLevel(card) : 0; const showDone = board.settings.completeOnFront;
  const dateText = card.start && card.due ? `${fmtDate(card.start)} – ${fmtDate(card.due)}` : card.due ? fmtDate(card.due) : card.start ? `${new Date(card.start + "T23:59:59") < new Date() ? "Started" : "Starts"}: ${fmtDate(card.start)}` : "";
  return <article className={"b-card" + (dragging ? " drag" : "") + (full ? " full" : "") + (age ? " age" + age : "") + (selected ? " sel" : "") + (card.dueComplete ? " complete" : "")} data-card-id={card.id} draggable={draggable} tabIndex={0} role="button" aria-label={`Open card ${card.title}`}
    style={full && coverAtt ? { backgroundImage: `linear-gradient(transparent 40%,rgba(0,0,0,.55)),url(${coverAtt.url})` } : undefined}
    onDragStart={e => { e.dataTransfer.setData("text/plain", card.id); e.dataTransfer.effectAllowed = "move"; onDragStart(); }} onDragEnd={onDragEnd} onClick={onOpen} onKeyDown={e => { if (e.key === "Enter" && e.target === e.currentTarget) onOpen(); }}>
    {!full && coverAtt && <div className="b-card__img" style={{ backgroundImage: `url(${coverAtt.url})` }} />}
    {!full && !coverAtt && coverColor && <div className={"b-card__cover lc-" + coverColor} />}
    {full && coverColor && !coverAtt && <div className={"b-card__fullbg lc-" + coverColor} />}
    <div className="b-card__body">
      {!full && labels.length > 0 && <div className={"b-card__lbls" + (collapsed ? " collapsed" : "")}>{labels.map(l => <button key={l!.id} type="button" className={"b-label lc-" + l!.color} title={`${labelColor(l!.color).name}${l!.name ? ": " + l!.name : ""}. Click to ${collapsed ? "show" : "hide"} label text`} aria-label={`Label ${l!.name || labelColor(l!.color).name}`} onClick={e => { e.stopPropagation(); toggleLabels(); }}>{collapsed ? "" : l!.name}</button>)}</div>}
      <div className="b-card__trow">
        {showDone && editable && <button type="button" className={"b-done" + (card.dueComplete ? " on" : "")} aria-label={card.dueComplete ? "Mark incomplete" : "Mark complete"} role="checkbox" aria-checked={card.dueComplete} onClick={e => { e.stopPropagation(); dispatch({ t: "card.patch", cardId: card.id, patch: { dueComplete: !card.dueComplete } }); }}>{card.dueComplete ? "✓" : ""}</button>}
        <div className="b-card__t">{pu.includes("numbers") && <span className="b-num">#{card.num} </span>}{card.title}</div>
      </div>
      {!full && (card.isTemplate || card.watchers.includes(me) || dateText || card.desc || card.comments.length > 0 || card.attachments.length > 0 || p.total > 0 || card.location || (pu.includes("voting") && card.votes.length > 0) || front.length > 0 || members.length > 0) && <div className="b-badges">
        {card.isTemplate && <span className="b-badge tpl" title="This card is a template."><LayoutTemplate size={14} />This card is a template.</span>}
        {card.watchers.includes(me) && <span className="b-badge" title="You are watching this card."><Eye size={14} /></span>}
        {dateText && <span className={"b-badge due " + (card.due ? due : "")} title={due === "overdue" ? "This card is past due." : due === "soon" ? "This card is due in less than twenty-four hours." : due === "complete" ? "This card is complete." : "Dates on this card"}><Clock size={14} />{dateText}</span>}
        {card.desc && <span className="b-badge" title="This card has a description."><AlignLeft size={14} /></span>}
        {card.comments.length > 0 && <span className="b-badge" title="Comments"><MessageSquare size={14} />{card.comments.length}</span>}
        {card.attachments.length > 0 && <span className="b-badge" title="Attachments"><Paperclip size={14} />{card.attachments.length}</span>}
        {p.total > 0 && <span className={"b-badge" + (p.done === p.total ? " done" : "")} title="Checklist items"><CheckSquare size={14} />{p.done}/{p.total}</span>}
        {card.location && <span className="b-badge" title={card.location.address}><MapPin size={14} />{card.location.name}</span>}
        {pu.includes("voting") && card.votes.length > 0 && <span className={"b-badge" + (card.votes.includes(me) ? " voted" : "")} title="Votes"><ThumbsUp size={14} />{card.votes.length}</span>}
        {front.map(f => { const v = card.custom[f.id]; const txt = f.type === "checkbox" ? "✓" : f.type === "list" ? f.options.find(o => o.id === v)?.name ?? "" : f.type === "date" ? fmtDate(String(v)) : String(v); const opt = f.type === "list" ? f.options.find(o => o.id === v) : null;
          return <span key={f.id} className={"b-badge field" + (opt ? " lc-" + opt.color : "")} title={f.name}>{f.name}: {txt}</span>; })}
        {members.length > 0 && <span className="b-members">{members.slice(0, 4).map(m => <Avatar key={m!.id} p={m!} size="sm" />)}{members.length > 4 && <span className="tr-pill">+{members.length - 4}</span>}</span>}
      </div>}
    </div>
  </article>;
}
