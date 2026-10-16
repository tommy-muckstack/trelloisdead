"use client";
// Board header: title, star, visibility, filter, members, Share and the "⋯" board menu.
import { useRef, useState } from "react";
import { Star, Lock, Users, Globe, ListFilter, MoreHorizontal, UserPlus, X } from "lucide-react";
import type { Board, Visibility } from "@/lib/model";
import { filterCount, EMPTY_FILTER, type Filter } from "@/lib/filter";
import { useApp } from "@/components/app/AppProvider";
import { SaveState, useBoard } from "@/components/app/BoardProvider";
import { PopHead, useDismiss } from "@/components/app/ui";
import { VIS } from "@/components/app/CreateBoard";
import { FilterPanel } from "@/components/board/FilterPanel";
import { MemberChip, ShareDialog } from "@/components/board/Share";
import { BoardMenu, type MenuView } from "@/components/board/BoardMenu";

export const VisIcon = ({ v, size = 16 }: { v: Visibility; size?: number }) => (v === "private" ? <Lock size={size} /> : v === "workspace" ? <Users size={size} /> : <Globe size={size} />);
export function BoardHeader({ filter, setFilter, filterOpen, setFilterOpen, menu, setMenu, extra }: { filter: Filter; setFilter: (f: Filter) => void; filterOpen: boolean; setFilterOpen: (o: boolean) => void; menu: MenuView | null; setMenu: (v: MenuView | null) => void; extra?: React.ReactNode }) {
  const app = useApp(); const { board, dispatch, editable, role } = useBoard(); const star = app.starred(board.id);
  const [visOpen, setVisOpen] = useState(false); const visRef = useRef<HTMLDivElement>(null); useDismiss(visRef, () => setVisOpen(false), visOpen);
  const fRef = useRef<HTMLDivElement>(null); useDismiss(fRef, () => setFilterOpen(false), filterOpen);
  const [share, setShare] = useState(false); const n = filterCount(filter);
  return <>
    <div className="b-bar" data-testid="board-header">
      <input className="b-title" aria-label="Board title" defaultValue={board.title} key={board.title} readOnly={!editable} size={Math.min(40, Math.max(4, board.title.length + 1))}
        onBlur={e => { if (e.target.value.trim() && e.target.value !== board.title) dispatch({ t: "board.patch", patch: { title: e.target.value } }); else e.target.value = board.title; }} onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { (e.target as HTMLInputElement).value = board.title; (e.target as HTMLInputElement).blur(); } }} />
      <button className="b-btn icon" aria-label={star ? "Unstar board" : "Star board"} title={star ? "Click to unstar this board. It will be removed from your starred list." : "Click to star this board. Starred boards show up at the top of your boards list."} aria-pressed={star} onClick={() => app.toggleStar(board.id)}><Star size={16} fill={star ? "#f5cd47" : "none"} color={star ? "#f5cd47" : "currentColor"} /></button>
      <div className="tr-dd" ref={visRef}><button className="b-btn icon" aria-label={`Visibility: ${VIS.find(v => v.v === board.visibility)!.label}`} title="Change visibility" aria-expanded={visOpen} onClick={() => setVisOpen(o => !o)}><VisIcon v={board.visibility} /></button>
        {visOpen && <div className="tr-pop" role="menu"><PopHead title="Change visibility" onClose={() => setVisOpen(false)} />
          {VIS.map(v => <button key={v.v} className={"tr-mi" + (board.visibility === v.v ? " on" : "")} role="menuitemradio" aria-checked={board.visibility === v.v} disabled={role !== "admin"} onClick={() => { dispatch({ t: "board.patch", patch: { visibility: v.v } }); setVisOpen(false); }}><v.Icon size={16} /><span>{v.label}{board.visibility === v.v ? " ✓" : ""}<small>{v.desc}</small></span></button>)}
          {role !== "admin" && <p className="muted" style={{ fontSize: 12 }}>Only board admins can change visibility.</p>}</div>}</div>
      {extra}
      <span className="b-sp" />
      <SaveState />
      <div className="tr-dd" ref={fRef}><button className={"b-btn" + (n ? " on" : "")} aria-expanded={filterOpen} onClick={() => setFilterOpen(!filterOpen)} data-testid="filter-btn"><ListFilter size={16} />Filter{n ? <span className="b-count">{n}</span> : null}</button>
        {filterOpen && <div className="tr-pop right wide b-filterpop"><FilterPanel filter={filter} setFilter={setFilter} onClose={() => setFilterOpen(false)} /></div>}</div>
      {n > 0 && <button className="b-btn" onClick={() => setFilter(EMPTY_FILTER)} aria-label="Clear all filters"><X size={14} />Clear all</button>}
      <div className="b-avatars" aria-label="Board members">{board.members.slice(0, 5).map(m => <MemberChip key={m.id} m={m} />)}{board.members.length > 5 && <button className="b-avbtn more" onClick={() => setShare(true)} aria-label={`${board.members.length - 5} more members`}>+{board.members.length - 5}</button>}</div>
      <button className="b-btn light" onClick={() => setShare(true)} data-testid="share-btn"><UserPlus size={16} />Share</button>
      <button className="b-btn icon" aria-label="Show menu" aria-expanded={!!menu} onClick={() => setMenu(menu ? null : "main")}><MoreHorizontal size={18} /></button>
      {menu && <BoardMenu view={menu} setView={setMenu} onClose={() => setMenu(null)} />}
    </div>
    <JoinBanner />
    {share && <ShareDialog onClose={() => setShare(false)} />}
  </>;
}
function JoinBanner() {
  const app = useApp(); const { board, role, via, replace } = useBoard(); const [busy, setBusy] = useState(false);
  if (role) return null;
  if (via === "workspace") return <div className="b-closed" data-testid="join-banner">You&apos;re viewing a Workspace board you&apos;re not a member of. <button className="tr-btn sm primary" disabled={busy} onClick={async () => { setBusy(true); try { const r = await app.call<{ board: Board }>("POST", `/api/b/${board.id}/members`, { join: true }); replace(r.board, "normal"); app.toast("You joined this board."); } catch (e) { app.toast((e as Error).message, { kind: "error" }); } finally { setBusy(false); } }}>Join board</button></div>;
  return <div className="b-closed">This board is public. Only board members can make changes.</div>;
}
