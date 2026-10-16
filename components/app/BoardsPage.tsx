"use client";
// Boards home: invitations, starred and recently viewed boards, every Workspace's boards, boards shared with you,
// and closed boards (reopen or delete).
import Link from "next/link";
import { useRef, useState } from "react";
import { Star, Clock, SquareKanban, Users, Settings, Archive } from "lucide-react";
import { bgCss, type Board, type BoardSummary } from "@/lib/model";
import { useApp } from "@/components/app/AppProvider";
import { BoardTile, WsIcon, useDismiss } from "@/components/app/ui";
import { CreateBoardPanel } from "@/components/app/CreateBoard";
import { Sidebar } from "@/components/app/Sidebar";

export function NewBoardTile({ workspaceId }: { workspaceId?: string }) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null); const ref = useRef<HTMLDivElement>(null); useDismiss(ref, () => setPos(null), !!pos);
  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (pos) return setPos(null); const r = e.currentTarget.getBoundingClientRect(); const w = Math.min(304, window.innerWidth - 16);
    const left = r.right + 8 + w <= window.innerWidth - 8 ? r.right + 8 : r.left - 8 - w >= 8 ? r.left - 8 - w : Math.max(8, (window.innerWidth - w) / 2);
    setPos({ left, top: Math.max(8, Math.min(r.top, window.innerHeight - 660)) });
  };
  return <div className="tr-dd" ref={ref}><button className="tr-tile new" onClick={toggle} aria-expanded={!!pos}>Create new board</button>
    {pos && <div className="tr-pop fixed" style={{ left: pos.left, top: pos.top, maxHeight: `calc(100vh - ${pos.top + 8}px)` }}><CreateBoardPanel workspaceId={workspaceId} onClose={() => setPos(null)} /></div>}</div>;
}
export function Invitations() {
  const app = useApp(); const [busy, setBusy] = useState("");
  if (!app.invites.length) return null;
  const answer = async (kind: string, id: string, accept: boolean) => { setBusy(id); try { await app.call("POST", "/api/invites", { kind, id, accept }); await app.refresh(); app.toast(accept ? "You joined. Welcome aboard." : "Invitation declined."); } catch (e) { app.toast((e as Error).message, { kind: "error" }); } finally { setBusy(""); } };
  return <section className="tr-sec" aria-label="Invitations"><h3 className="tr-h3"><Users size={18} />Invitations</h3>
    {app.invites.map(i => <div key={i.kind + i.id} className="tr-invite"><div className="grow"><b>{i.byName}</b> invited you to the {i.kind === "workspace" ? "Workspace" : "board"} <b>{i.name}</b>{i.role === "admin" ? " as an admin" : i.role === "observer" ? " as an observer" : ""}.</div>
      <button className="tr-btn primary sm" disabled={busy === i.id} onClick={() => answer(i.kind, i.id, true)}>Join</button><button className="tr-btn sm" disabled={busy === i.id} onClick={() => answer(i.kind, i.id, false)}>Decline</button></div>)}</section>;
}
export function ClosedBoards({ onClose }: { onClose: () => void }) {
  const app = useApp(); const closed = app.boards.filter(b => b.closed); const [confirm, setConfirm] = useState<BoardSummary | null>(null);
  const reopen = async (b: BoardSummary) => { try { const { board } = await app.call<{ board: Board }>("POST", `/api/b/${b.id}`, { actions: [{ t: "board.patch", patch: { closed: false } }] }); app.setBoardSummary({ ...b, closed: board.closed }); app.toast(`${b.title} is open again.`); } catch (e) { app.toast((e as Error).message, { kind: "error" }); } };
  const del = async (b: BoardSummary) => { try { await app.call("DELETE", `/api/b/${b.id}`); setConfirm(null); await app.refresh(); app.toast(`${b.title} was deleted.`); } catch (e) { app.toast((e as Error).message, { kind: "error" }); } };
  return <div className="tr-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="tr-dialog wide" role="dialog" aria-modal="true" aria-labelledby="closed-h">
    <button className="tr-x" aria-label="Close" onClick={onClose}>×</button><h2 id="closed-h"><Archive size={18} style={{ verticalAlign: -3 }} /> Closed boards</h2>
    {!closed.length && <p className="muted">No boards have been closed.</p>}
    {closed.map(b => <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <span className="tr-mi__thumb" style={{ background: bgCss(b.bg, true) }} /><div style={{ flex: 1 }}><Link href={`/app/b/${b.id}`}>{b.title}</Link><small className="muted" style={{ display: "block" }}>{app.workspaces.find(w => w.id === b.workspaceId)?.name ?? ""}</small></div>
      {b.role === "admin" ? <><button className="tr-btn sm" onClick={() => reopen(b)}>Reopen</button><button className="tr-btn sm danger" onClick={() => setConfirm(b)}>Delete</button></> : <span className="muted" style={{ fontSize: 12 }}>Only board admins can reopen or delete</span>}
    </div>)}
    {confirm && <div className="tr-invite" style={{ marginTop: 16, background: "var(--danger-bg)" }} role="alertdialog" aria-labelledby="del-h"><div className="grow"><b id="del-h">Delete {confirm.title}?</b><div style={{ fontSize: 13 }}>All lists, cards and actions will be deleted, and you won&apos;t be able to re-open the board. There is no undo.</div></div>
      <button className="tr-btn danger sm" onClick={() => del(confirm)}>Delete forever</button><button className="tr-btn sm" onClick={() => setConfirm(null)}>Cancel</button></div>}
  </div></div>;
}
export function BoardsPage() {
  const app = useApp(); const [closedOpen, setClosedOpen] = useState(false);
  const open = app.boards.filter(b => !b.closed); const byId = new Map(open.map(b => [b.id, b]));
  const starred = app.user.starred.map(id => byId.get(id)).filter((b): b is BoardSummary => !!b);
  const recent = app.user.recent.map(r => byId.get(r.id)).filter((b): b is BoardSummary => !!b).slice(0, 4);
  const mine = new Set(app.workspaces.map(w => w.id)); const shared = open.filter(b => !mine.has(b.workspaceId));
  return <div className="tr-page"><Sidebar active="boards" />
    <main className="tr-main" data-testid="boards">
      <Invitations />
      {starred.length > 0 && <section className="tr-sec"><h3 className="tr-h3"><Star size={18} />Starred boards</h3><div className="tr-tiles">{starred.map(b => <BoardTile key={b.id} b={b} />)}</div></section>}
      {recent.length > 0 && <section className="tr-sec"><h3 className="tr-h3"><Clock size={18} />Recently viewed</h3><div className="tr-tiles">{recent.map(b => <BoardTile key={b.id} b={b} />)}</div></section>}
      <h3 className="tr-h3" style={{ textTransform: "uppercase", fontSize: 14, color: "var(--subtle)", marginTop: 8 }}>Your Workspaces</h3>
      {app.workspaces.map(w => { const boards = open.filter(b => b.workspaceId === w.id);
        return <section key={w.id} className="tr-sec" data-ws={w.id}>
          <div className="tr-wshd"><WsIcon ws={w} /><b>{w.name}</b>
            <Link className="tr-btn sm" href={`/app/w/${w.id}`}><SquareKanban size={14} />Boards</Link><Link className="tr-btn sm" href={`/app/w/${w.id}/members`}><Users size={14} />Members ({w.members.length})</Link><Link className="tr-btn sm" href={`/app/w/${w.id}/settings`}><Settings size={14} />Settings</Link></div>
          <div className="tr-tiles">{boards.map(b => <BoardTile key={b.id} b={b} />)}<NewBoardTile workspaceId={w.id} /></div></section>; })}
      {shared.length > 0 && <section className="tr-sec"><h3 className="tr-h3" style={{ textTransform: "uppercase", fontSize: 14, color: "var(--subtle)" }}>Guest Workspaces</h3><p className="muted" style={{ marginTop: -8 }}>Boards you were invited to in other people&apos;s Workspaces.</p><div className="tr-tiles">{shared.map(b => <BoardTile key={b.id} b={b} />)}</div></section>}
      <button className="tr-btn" onClick={() => setClosedOpen(true)}>View all closed boards</button>
      {closedOpen && <ClosedBoards onClose={() => setClosedOpen(false)} />}
    </main></div>;
}
