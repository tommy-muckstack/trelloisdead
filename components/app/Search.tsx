"use client";
// Global search: header box with live results (boards + cards) and a full search page with operators.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { bgCss, fmtDate, labelColor, type BoardSummary } from "@/lib/model";
import type { SearchHit } from "@/lib/server/data";
import { useApp } from "@/components/app/AppProvider";
import { useDismiss } from "@/components/app/ui";
import { DueBadge } from "@/components/app/HomePage";

type Result = { cards: SearchHit[]; boards: BoardSummary[] };
export function useSearch(q: string, delay = 250) {
  const app = useApp(); const [res, setRes] = useState<Result | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!q.trim()) { setRes(null); return; } setBusy(true); const t = setTimeout(() => { app.call<Result>("GET", `/api/search?q=${encodeURIComponent(q)}`).then(setRes).catch(() => setRes({ cards: [], boards: [] })).finally(() => setBusy(false)); }, delay); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  return { res, busy };
}
export const OPERATORS: [string, string][] = [["@me", "cards assigned to you (or @username)"], ["#label", "cards with a label name or colour"], ["board:name", "cards on matching boards"], ["list:name", "cards in matching lists"], ["due:day / week / month / overdue", "cards by due date"], ["has:attachments / description / cover / members / checklist", "cards that have one"], ["is:archived / open / starred / complete", "card or board state"], ['"exact phrase"', "match words together"]];
export function HeaderSearch() {
  const app = useApp(); const router = useRouter(); const [q, setQ] = useState(""); const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null); const input = useRef<HTMLInputElement>(null);
  useDismiss(ref, () => setOpen(false), open); const { res, busy } = useSearch(q);
  useEffect(() => { const h = () => { setOpen(true); input.current?.focus(); }; window.addEventListener("trelloisdead:search", h); return () => window.removeEventListener("trelloisdead:search", h); }, []);
  const boards = q.trim() ? app.boards.filter(b => b.title.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 5) : app.user.recent.map(r => app.boards.find(b => b.id === r.id)).filter((b): b is BoardSummary => !!b).slice(0, 5);
  const go = (path: string) => { setOpen(false); setQ(""); router.push(path); };
  return <div className="tr-search" ref={ref} data-testid="header-search">
    <SearchIcon size={16} className="ico" aria-hidden /><input ref={input} type="search" aria-label="Search" placeholder="Search" value={q} onFocus={() => setOpen(true)} onChange={e => { setQ(e.target.value); setOpen(true); }}
      onKeyDown={e => { if (e.key === "Enter" && q.trim()) go(`/app/search?q=${encodeURIComponent(q)}`); if (e.key === "Escape") { e.preventDefault(); setOpen(false); (e.target as HTMLInputElement).blur(); } }} />
    {open && <div className="tr-pop tr-search__pop" role="listbox" aria-label="Search results">
      <h6>{q.trim() ? "Boards" : "Recent boards"}</h6>
      {boards.map(b => <button key={b.id} className="tr-mi" role="option" aria-selected={false} onClick={() => go(`/app/b/${b.id}`)}><span className="tr-mi__thumb" style={{ background: bgCss(b.bg, true), width: 32, height: 24 }} />{b.title}</button>)}
      {!boards.length && <p className="muted" style={{ margin: "0 0 8px" }}>{q.trim() ? "No boards match." : "Boards you open show up here."}</p>}
      {q.trim() && <><h6>Cards</h6>{busy && !res && <p className="muted">Searching…</p>}
        {res?.cards.slice(0, 6).map(c => <button key={c.boardId + c.cardId} className="tr-mi" role="option" aria-selected={false} onClick={() => go(`/app/b/${c.boardId}?card=${c.cardId}`)}><span><b style={{ fontWeight: 600 }}>{c.title}</b><small>{c.boardTitle}: {c.list}{c.archived ? " (archived)" : ""}</small></span></button>)}
        {res && !res.cards.length && <p className="muted" style={{ margin: "0 0 8px" }}>No cards match.</p>}
        <hr className="tr-sep" /><button className="tr-mi" onClick={() => go(`/app/search?q=${encodeURIComponent(q)}`)}><SearchIcon size={16} />Advanced search: “{q}”</button></>}
      {!q.trim() && <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>Tip: try <code>@me due:week</code> or <code>#urgent board:launch</code>.</p>}
    </div>}
  </div>;
}
export function SearchPage({ initial }: { initial: string }) {
  const router = useRouter(); const [q, setQ] = useState(initial); const { res, busy } = useSearch(q, 300);
  useEffect(() => { router.replace(q ? `/app/search?q=${encodeURIComponent(q)}` : "/app/search", { scroll: false }); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  return <main className="tr-main wide" style={{ margin: "0 auto" }} data-testid="search-page">
    <h1 style={{ fontSize: 22, margin: "0 0 12px" }}>Search</h1>
    <div style={{ position: "relative", maxWidth: 640 }}><SearchIcon size={18} style={{ position: "absolute", left: 10, top: 9, color: "var(--subtle)" }} /><input className="tr-in" autoFocus aria-label="Search cards and boards" value={q} onChange={e => setQ(e.target.value)} style={{ paddingLeft: 36, height: 38 }} placeholder="Search cards, boards, comments, checklists…" />{q && <button className="tr-ib" aria-label="Clear search" onClick={() => setQ("")} style={{ position: "absolute", right: 2, top: 3 }}><X size={16} /></button>}</div>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 32, marginTop: 20 }} className="tr-searchgrid">
      <section>{!q.trim() ? <p className="muted">Type to search every board you can see.</p> : busy && !res ? <p className="muted">Searching…</p> : res && <>
        {res.boards.length > 0 && <><h2 className="tr-h3">Boards</h2><div className="tr-tiles" style={{ marginBottom: 24 }}>{res.boards.map(b => <div key={b.id} className="tr-tile" style={{ background: bgCss(b.bg, true) }}><Link href={`/app/b/${b.id}`}>{b.title}</Link></div>)}</div></>}
        <h2 className="tr-h3">Cards ({res.cards.length}{res.cards.length >= 200 ? "+" : ""})</h2>
        {!res.cards.length && <p className="muted">We couldn&apos;t find any cards that matched your search.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }} data-testid="search-cards">{res.cards.map(c => <Link key={c.boardId + c.cardId} href={`/app/b/${c.boardId}?card=${c.cardId}`} className="tr-homecard">
          <span className="tr-mi__thumb" style={{ background: bgCss(c.bg, true), width: 8, height: "auto", alignSelf: "stretch" }} />
          <span style={{ flex: 1, minWidth: 0 }}>{c.labels.length > 0 && <span style={{ display: "flex", gap: 4, marginBottom: 4 }}>{c.labels.map((l, i) => <i key={i} style={{ width: 32, height: 6, borderRadius: 3, background: labelColor(l).hex }} />)}</span>}
            <b>{c.title}</b>{c.archived && <span className="tr-pill" style={{ marginLeft: 6 }}>Archived</span>}<small className="muted" style={{ display: "block" }}>{c.boardTitle}: {c.list}{c.due ? ` · due ${fmtDate(c.due)}` : ""}</small></span>
          <DueBadge due={c.due} complete={c.dueComplete} /></Link>)}</div></>}</section>
      <aside><h2 className="tr-h3" style={{ fontSize: 14 }}>Refine your search</h2><ul className="tr-ops">{OPERATORS.map(([op, d]) => <li key={op}><button onClick={() => setQ(x => (x.trim() + " " + op.split(" ")[0]).trim() + " ")}><code>{op}</code></button><span className="muted">{d}</span></li>)}</ul></aside>
    </div></main>;
}
