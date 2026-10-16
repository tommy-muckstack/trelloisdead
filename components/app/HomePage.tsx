"use client";
// Home: cards assigned to you (overdue first), recently viewed boards and quick links.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock, Plus, LayoutTemplate } from "lucide-react";
import { bgCss, dueStatus, fmtDate, labelColor, type Label } from "@/lib/model";
import { useApp } from "@/components/app/AppProvider";
import { Sidebar } from "@/components/app/Sidebar";

export type MyCard = { boardId: string; boardTitle: string; bg: string; workspaceId: string; cardId: string; title: string; list: string; labels: Label[]; due: string | null; dueComplete: boolean; start: string | null };
export function DueBadge({ due, complete }: { due: string | null; complete: boolean }) {
  if (!due) return null; const st = dueStatus({ due, dueComplete: complete });
  return <span className={"tr-due " + st} title={st === "overdue" ? "This card is past due." : st === "soon" ? "This card is due in less than twenty-four hours." : st === "complete" ? "This card is complete." : "This card is due later."}><Clock size={12} />{fmtDate(due)}</span>;
}
export function HomePage() {
  const app = useApp(); const [cards, setCards] = useState<MyCard[] | null>(null);
  useEffect(() => { app.call<{ cards: MyCard[] }>("GET", "/api/me/cards").then(r => setCards(r.cards)).catch(() => setCards([])); }, [app]);
  const sorted = (cards ?? []).filter(c => !c.dueComplete).sort((a, b) => (a.due ? new Date(a.due).getTime() : Infinity) - (b.due ? new Date(b.due).getTime() : Infinity));
  const recent = app.user.recent.map(r => app.boards.find(b => b.id === r.id && !b.closed)).filter(Boolean).slice(0, 6);
  return <div className="tr-page"><Sidebar active="home" />
    <main className="tr-main" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 260px", gap: 32, maxWidth: 1100 }} data-testid="home">
      <section><h2 style={{ fontSize: 20, margin: "0 0 4px" }}>Up next</h2><p className="muted" style={{ marginTop: 0 }}>Cards you&apos;re a member of, soonest due first.</p>
        {cards === null ? <p className="muted">Loading…</p> : !sorted.length ? <div className="tr-empty">Nothing assigned to you yet. Open a card and press <kbd>Space</kbd> (or click Join) to add yourself.</div> :
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{sorted.map(c => <Link key={c.boardId + c.cardId} href={`/app/b/${c.boardId}?card=${c.cardId}`} className="tr-homecard">
            <span className="tr-mi__thumb" style={{ background: bgCss(c.bg, true), width: 8, height: "auto", alignSelf: "stretch" }} />
            <span style={{ flex: 1, minWidth: 0 }}>{c.labels.length > 0 && <span style={{ display: "flex", gap: 4, marginBottom: 4 }}>{c.labels.map(l => <i key={l.id} style={{ width: 32, height: 6, borderRadius: 3, background: labelColor(l.color).hex }} />)}</span>}
              <b>{c.title}</b><small className="muted" style={{ display: "block" }}>{c.boardTitle}: {c.list}</small></span>
            <DueBadge due={c.due} complete={c.dueComplete} /></Link>)}</div>}
      </section>
      <aside><h3 className="tr-h3" style={{ fontSize: 13, color: "var(--subtle)" }}><Clock size={16} />Recently viewed</h3>
        {recent.length ? recent.map(b => <Link key={b!.id} className="tr-mi" href={`/app/b/${b!.id}`} style={{ margin: 0, width: "100%", borderRadius: 6 }}><span className="tr-mi__thumb" style={{ background: bgCss(b!.bg, true), width: 32, height: 24 }} />{b!.title}</Link>) : <p className="muted">Boards you open show up here.</p>}
        <h3 className="tr-h3" style={{ fontSize: 13, color: "var(--subtle)", marginTop: 24 }}>Links</h3>
        <Link className="tr-mi" href="/app" style={{ margin: 0, width: "100%", borderRadius: 6 }}><Plus size={16} />Create a board</Link>
        <Link className="tr-mi" href="/app/templates" style={{ margin: 0, width: "100%", borderRadius: 6 }}><LayoutTemplate size={16} />Browse templates</Link>
      </aside>
    </main></div>;
}
