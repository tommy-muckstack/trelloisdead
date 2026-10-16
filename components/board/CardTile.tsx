"use client";
// Front of a card: cover, labels, title and badges.
import { AlignLeft, CheckSquare, Clock } from "lucide-react";
import { fmtDate, dueStatus, progress, type Card } from "@/lib/model";
import { useBoard } from "@/components/app/BoardProvider";

export function CardTile({ card, dragging, draggable, onOpen, onDragStart, onDragEnd }: { card: Card; dragging: boolean; draggable: boolean; onOpen: () => void; onDragStart: () => void; onDragEnd: () => void }) {
  const { board } = useBoard(); const p = progress(card); const due = dueStatus(card);
  const labels = card.labels.map(id => board.labels.find(l => l.id === id)).filter(Boolean);
  return <article className={"b-card" + (dragging ? " drag" : "")} data-card-id={card.id} draggable={draggable} tabIndex={0} role="button" aria-label={`Open card ${card.title}`}
    onDragStart={e => { e.dataTransfer.setData("text/plain", card.id); e.dataTransfer.effectAllowed = "move"; onDragStart(); }} onDragEnd={onDragEnd} onClick={onOpen} onKeyDown={e => { if (e.key === "Enter") onOpen(); }}>
    <div className="b-card__body">
      {labels.length > 0 && <div className="b-card__lbls">{labels.map(l => <span key={l!.id} className={"b-label lc-" + l!.color} title={l!.name || l!.color.replace("_", " ")}>{l!.name}</span>)}</div>}
      <div className="b-card__t">{card.title}</div>
      {(card.due || card.desc || p.total > 0) && <div className="b-badges">
        {card.due && <span className={"b-badge due " + due} title={due === "overdue" ? "This card is past due." : due === "soon" ? "This card is due soon." : due === "complete" ? "This card is complete." : "This card is due later."}><Clock size={14} />{fmtDate(card.due)}</span>}
        {card.desc && <span className="b-badge" title="This card has a description."><AlignLeft size={14} /></span>}
        {p.total > 0 && <span className={"b-badge" + (p.done === p.total ? " done" : "")} title="Checklist items"><CheckSquare size={14} />{p.done}/{p.total}</span>}
      </div>}
    </div>
  </article>;
}
