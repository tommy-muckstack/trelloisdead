"use client";
// Share dialog (invite by email, share link, board members and roles) and the member popover in the board header.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, UserPlus } from "lucide-react";
import type { Board, BoardMember, Role } from "@/lib/model";
import { BP } from "@/lib/basepath";
import { track, EVENTS } from "@/lib/analytics";
import { useApp } from "@/components/app/AppProvider";
import { useBoard } from "@/components/app/BoardProvider";
import { Avatar, PopHead, copyText, useDismiss } from "@/components/app/ui";

const ROLE_LABEL: Record<Role, string> = { admin: "Admin", normal: "Member", observer: "Observer" };
export function ShareDialog({ onClose }: { onClose: () => void }) {
  const app = useApp(); const { board, role, me, dispatch, replace } = useBoard(); const router = useRouter();
  const [email, setEmail] = useState(""); const [r, setR] = useState<Role>("normal"); const [busy, setBusy] = useState(false); const [token, setToken] = useState<string | null>(null); const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  const admin = role === "admin"; const ws = app.workspaces.find(w => w.id === board.workspaceId);
  const notOnBoard = (ws?.members ?? []).filter(m => !board.members.some(b => b.id === m.id));
  const invite = async (address: string, as: Role) => {
    if (!app.requireAccount("Sharing a board needs an account, so the people you invite know who it's from.")) return; setBusy(true);
    try { const res = await app.call<{ added: boolean; board: Board }>("POST", `/api/b/${board.id}/members`, { email: address, role: as }); track(EVENTS.app_shared, { object: "board", method: "invite", role: as }); if (res.added) replace(res.board); app.toast(res.added ? `${address} was added to the board.` : `Invitation saved. ${address} will see it when they sign up with that email. Share the board link to nudge them.`); setEmail(""); }
    catch (e) { if (!(e as { signIn?: boolean }).signIn) app.toast((e as Error).message, { kind: "error" }); } finally { setBusy(false); }
  };
  const makeLink = async () => { if (!app.requireAccount("Share links need an account.")) return; try { const { token } = await app.call<{ token: string }>("POST", `/api/b/${board.id}/link`, {}); track(EVENTS.app_shared, { object: "board", method: "link" }); setToken(token); await copyText(`${window.location.origin}${BP}/app/join/${token}`); app.toast("Link copied to the clipboard."); } catch (e) { if (!(e as { signIn?: boolean }).signIn) app.toast((e as Error).message, { kind: "error" }); } };
  const killLink = async () => { try { await app.call("DELETE", `/api/b/${board.id}/link`); setToken(null); app.toast("Share link deleted. The old link no longer works."); } catch (e) { app.toast((e as Error).message, { kind: "error" }); } };
  const leave = () => { dispatch({ t: "member.remove", userId: me }, { undoable: false }); onClose(); setTimeout(() => router.push("/app"), 400); };
  return <div className="tr-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="tr-dialog wide" role="dialog" aria-modal="true" aria-labelledby="share-h" data-testid="share-dialog">
    <button className="tr-x" aria-label="Close" onClick={onClose}>×</button><h2 id="share-h">Share board</h2>
    <form onSubmit={e => { e.preventDefault(); if (email.trim()) void invite(email.trim(), r); }} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <input className="tr-in" type="email" required placeholder="Email address" aria-label="Email address" value={email} onChange={e => setEmail(e.target.value)} style={{ flex: "1 1 220px" }} />
      <select className="tr-in" aria-label="Role" value={r} onChange={e => setR(e.target.value as Role)} style={{ width: 130 }}><option value="normal">Member</option><option value="observer">Observer</option>{admin && <option value="admin">Admin</option>}</select>
      <button className="tr-btn primary" style={{ height: 36 }} disabled={busy}>Share</button></form>
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0", flexWrap: "wrap" }}><span className="tr-av" style={{ background: "var(--hover)", color: "var(--subtle)" }}><Link2 size={16} /></span>
      <div style={{ flex: 1, minWidth: 200 }}><b style={{ display: "block" }}>Share this board with a link</b>{token ? <code style={{ fontSize: 12, wordBreak: "break-all" }}>{origin}{BP}/app/join/{token}</code> : <span className="muted" style={{ fontSize: 13 }}>Anyone with the link can join as a member.</span>}</div>
      <button className="tr-btn sm" onClick={makeLink}>{token ? "Copy link" : "Create link"}</button>{token && admin && <button className="tr-btn sm subtle" onClick={killLink}>Delete link</button>}</div>
    <h3 className="tr-h3" style={{ fontSize: 14 }}>Board members ({board.members.length})</h3>
    <div data-testid="board-members">{board.members.map(m => <MemberRow key={m.id} m={m} />)}</div>
    {role && <button className="tr-btn sm" style={{ marginTop: 8 }} onClick={leave} disabled={role === "admin" && board.members.filter(x => x.role === "admin").length < 2} title={role === "admin" && board.members.filter(x => x.role === "admin").length < 2 ? "Make someone else an admin before leaving." : undefined}>Leave board</button>}
    {notOnBoard.length > 0 && role && role !== "observer" && <><h3 className="tr-h3" style={{ fontSize: 14, marginTop: 20 }}>Workspace members not on this board</h3>
      {notOnBoard.map(m => <div key={m.id} className="b-mrow"><Avatar p={m} /><div className="grow"><b>{m.name}</b><small className="muted">@{m.username}</small></div><button className="tr-btn sm" onClick={() => invite(m.email, "normal")} disabled={busy || !m.email}><UserPlus size={14} />Add</button></div>)}</>}
  </div></div>;
}
function MemberRow({ m }: { m: BoardMember }) {
  const { board, role, me, dispatch } = useBoard(); const admin = role === "admin"; const lastAdmin = m.role === "admin" && board.members.filter(x => x.role === "admin").length < 2;
  return <div className="b-mrow"><Avatar p={m} /><div className="grow"><b>{m.name}{m.id === me && " (you)"}</b><small className="muted">@{m.username}{m.id === board.ownerId ? " · Board creator" : ""}</small></div>
    {admin && m.id !== me ? <><select className="tr-in" aria-label={`Role for ${m.name}`} value={m.role} disabled={lastAdmin} onChange={e => dispatch({ t: "member.role", userId: m.id, role: e.target.value as Role })} style={{ width: 120 }}><option value="admin">Admin</option><option value="normal">Member</option><option value="observer">Observer</option></select>
      <button className="tr-btn sm" onClick={() => dispatch({ t: "member.remove", userId: m.id }, { undoable: false })}>Remove</button></> : <span className="tr-pill">{ROLE_LABEL[m.role]}</span>}</div>;
}
/** Avatar in the board header; click for name, role and (for admins) role change / remove. */
export function MemberChip({ m }: { m: BoardMember }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null); useDismiss(ref, () => setOpen(false), open); const { role, me, dispatch, board } = useBoard();
  const lastAdmin = m.role === "admin" && board.members.filter(x => x.role === "admin").length < 2;
  return <div className="tr-dd" ref={ref}><button className="b-avbtn" aria-label={`${m.name} (${ROLE_LABEL[m.role]})`} aria-expanded={open} onClick={() => setOpen(o => !o)}><Avatar p={m} size="sm" /></button>
    {open && <div className="tr-pop right" role="dialog" aria-label={m.name}><PopHead title={m.name} onClose={() => setOpen(false)} />
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}><Avatar p={m} size="lg" /><div><b>{m.name}</b><div className="muted">@{m.username}</div><span className="tr-pill" style={{ marginTop: 4 }}>{ROLE_LABEL[m.role]}</span></div></div>
      {role === "admin" && m.id !== me && <><label className="tr-lbl" htmlFor={"role-" + m.id}>Change permissions</label><select id={"role-" + m.id} className="tr-in" value={m.role} disabled={lastAdmin} onChange={e => dispatch({ t: "member.role", userId: m.id, role: e.target.value as Role })}><option value="admin">Admin: can view and edit cards, remove members, and change board settings</option><option value="normal">Member: can view and edit cards</option><option value="observer">Observer: can view and comment</option></select>
        <button className="tr-mi danger" style={{ marginTop: 8 }} onClick={() => { dispatch({ t: "member.remove", userId: m.id }, { undoable: false }); setOpen(false); }}>Remove from board</button></>}
    </div>}</div>;
}
