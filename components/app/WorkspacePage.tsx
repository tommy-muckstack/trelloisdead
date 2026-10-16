"use client";
// Workspace pages: boards (search + sort), members (roles, invites by email, invite link) and settings.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Lock, Globe, Link2, Pencil, Trash2, LogOut } from "lucide-react";
import { type Workspace, type WorkspaceType } from "@/lib/model";
import { BP } from "@/lib/basepath";
import { useApp } from "@/components/app/AppProvider";
import { BoardTile, WsIcon, Avatar, copyText, absUrl } from "@/components/app/ui";
import { Sidebar, WS_PAGES } from "@/components/app/Sidebar";
import { NewBoardTile, ClosedBoards } from "@/components/app/BoardsPage";

const TYPES: [WorkspaceType, string][] = [["", "Choose…"], ["education", "Education"], ["engineering", "Engineering-IT"], ["hr", "Human Resources"], ["marketing", "Marketing"], ["operations", "Operations"], ["sales", "Sales CRM"], ["small-business", "Small Business"], ["other", "Other"]];
function useWs(id: string) { const app = useApp(); return { app, ws: app.workspaces.find(w => w.id === id) ?? null, me: app.user.id }; }
function WsHeader({ ws, tab }: { ws: Workspace; tab: string }) {
  const app = useApp(); const admin = ws.members.find(m => m.id === app.user.id)?.role === "admin"; const [edit, setEdit] = useState(false); const [name, setName] = useState(ws.name); const [desc, setDesc] = useState(ws.desc);
  const save = async (e: React.FormEvent) => { e.preventDefault(); try { const { workspace } = await app.call<{ workspace: Workspace }>("PATCH", `/api/workspaces/${ws.id}`, { name, desc }); app.setWorkspace(workspace); setEdit(false); } catch (err) { app.toast((err as Error).message, { kind: "error" }); } };
  return <><div style={{ display: "flex", gap: 16, alignItems: "center", paddingBottom: 24, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
    <WsIcon ws={ws} lg />
    {edit ? <form onSubmit={save} style={{ flex: 1, maxWidth: 420 }}><label className="tr-lbl" htmlFor="wsn">Name</label><input id="wsn" className="tr-in" value={name} onChange={e => setName(e.target.value)} maxLength={100} autoFocus />
      <label className="tr-lbl" htmlFor="wsd">Description <span className="muted" style={{ fontWeight: 400 }}>Optional</span></label><textarea id="wsd" className="tr-in" value={desc} onChange={e => setDesc(e.target.value)} maxLength={1000} />
      <div className="row" style={{ display: "flex", gap: 8, marginTop: 8 }}><button className="tr-btn primary" disabled={!name.trim()}>Save</button><button type="button" className="tr-btn" onClick={() => setEdit(false)}>Cancel</button></div></form>
      : <div style={{ flex: 1 }}><h1 style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>{ws.name}{admin && <button className="tr-ib" aria-label="Edit Workspace details" onClick={() => setEdit(true)} style={{ borderRadius: 3 }}><Pencil size={14} /></button>}</h1>
        <p className="muted" style={{ margin: "2px 0 0", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>{ws.visibility === "private" ? <><Lock size={12} />Private</> : <><Globe size={12} />Public</>}{ws.desc && <> · {ws.desc}</>}</p></div>}
  </div>
  <nav className="tr-tabs" aria-label="Workspace">{WS_PAGES.map(p => <Link key={p.key} href={p.href(ws.id)} className={tab === p.key ? "on" : ""}>{p.label}{p.key === "members" ? ` (${ws.members.length})` : ""}</Link>)}</nav></>;
}
function Missing() { return <div className="tr-page"><Sidebar /><main className="tr-main"><h1 style={{ fontSize: 20 }}>Workspace not found</h1><p className="muted">This Workspace may be private, or you may not be a member anymore.</p><Link className="tr-btn" href="/app">Back to your boards</Link></main></div>; }

export function WorkspaceBoards({ id }: { id: string }) {
  const { app, ws } = useWs(id); const [q, setQ] = useState(""); const [sort, setSort] = useState<"recent" | "az" | "za">("recent"); const [closed, setClosed] = useState(false);
  const boards = useMemo(() => { const bs = app.boards.filter(b => b.workspaceId === id && !b.closed && (!q.trim() || b.title.toLowerCase().includes(q.trim().toLowerCase())));
    return sort === "recent" ? bs : [...bs].sort((a, b) => (sort === "az" ? 1 : -1) * a.title.localeCompare(b.title)); }, [app.boards, id, q, sort]);
  if (!ws) return <Missing />;
  return <div className="tr-page"><Sidebar /><main className="tr-main wide" data-testid="ws-boards"><WsHeader ws={ws} tab="boards" />
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20, alignItems: "end" }}>
      <div><label className="tr-lbl" htmlFor="ws-sort">Sort by</label><select id="ws-sort" className="tr-in" value={sort} onChange={e => setSort(e.target.value as typeof sort)} style={{ width: 220 }}><option value="recent">Most recently active</option><option value="az">Alphabetically A–Z</option><option value="za">Alphabetically Z–A</option></select></div>
      <div style={{ marginLeft: "auto" }}><label className="tr-lbl" htmlFor="ws-q">Search</label><input id="ws-q" className="tr-in" placeholder="Search boards" value={q} onChange={e => setQ(e.target.value)} style={{ width: 240 }} /></div>
    </div>
    <div className="tr-tiles"><NewBoardTile workspaceId={id} />{boards.map(b => <BoardTile key={b.id} b={b} />)}</div>
    {q && !boards.length && <p className="muted">No boards match “{q}”.</p>}
    <button className="tr-btn" style={{ marginTop: 24 }} onClick={() => setClosed(true)}>View closed boards</button>{closed && <ClosedBoards onClose={() => setClosed(false)} />}
  </main></div>;
}

export function WorkspaceMembers({ id }: { id: string }) {
  const { app, ws, me } = useWs(id); const router = useRouter(); const [email, setEmail] = useState(""); const [role, setRole] = useState<"normal" | "admin">("normal"); const [busy, setBusy] = useState(false); const [link, setLink] = useState<string | null>(ws?.inviteToken ? `${BP}/app/join/${ws.inviteToken}` : null); const [q, setQ] = useState("");
  const [origin, setOrigin] = useState(""); useEffect(() => setOrigin(window.location.origin), []);
  if (!ws) return <Missing />;
  const admin = ws.members.find(m => m.id === me)?.role === "admin";
  const done = (w: Workspace) => app.setWorkspace(w);
  const invite = async (e: React.FormEvent) => { e.preventDefault(); if (!app.requireAccount("Inviting people to a Workspace needs an account, so they know who invited them.")) return; setBusy(true);
    try { const r = await app.call<{ added: boolean; ws: Workspace }>("POST", `/api/workspaces/${id}/members`, { email, role }); done(r.ws); app.toast(r.added ? `${email} is now a member.` : `Invitation saved. ${email} will see it when they sign up with that address. You can also send them the invite link.`); setEmail(""); }
    catch (err) { if (!(err as { signIn?: boolean }).signIn) app.toast((err as Error).message, { kind: "error" }); } finally { setBusy(false); } };
  const setMemberRole = async (userId: string, r: "admin" | "normal" | null) => { try { const { workspace } = await app.call<{ workspace: Workspace }>("PATCH", `/api/workspaces/${id}/members`, { userId, role: r }); if (userId === me && !r) { await app.refresh(); router.push("/app"); return; } done(workspace); } catch (err) { app.toast((err as Error).message, { kind: "error" }); } };
  const makeLink = async (reset = false) => { if (!app.requireAccount("Invite links need an account.")) return; try { const { token } = await app.call<{ token: string }>("POST", `/api/workspaces/${id}/link`, { reset }); const url = `${BP}/app/join/${token}`; setLink(url); await copyText(absUrl(url)); app.toast("Invite link copied to the clipboard."); } catch (err) { if (!(err as { signIn?: boolean }).signIn) app.toast((err as Error).message, { kind: "error" }); } };
  const killLink = async () => { try { await app.call("DELETE", `/api/workspaces/${id}/link`); setLink(null); app.toast("Invite link disabled."); } catch (err) { app.toast((err as Error).message, { kind: "error" }); } };
  const cancel = async (em: string) => { try { await app.call("DELETE", `/api/workspaces/${id}/members?email=${encodeURIComponent(em)}`); await app.refresh(); } catch (err) { app.toast((err as Error).message, { kind: "error" }); } };
  const members = ws.members.filter(m => !q.trim() || (m.name + " " + m.username + " " + m.email).toLowerCase().includes(q.trim().toLowerCase()));
  return <div className="tr-page"><Sidebar /><main className="tr-main wide" data-testid="ws-members"><WsHeader ws={ws} tab="members" />
    {admin && <section className="tr-sec"><h3 className="tr-h3">Invite Workspace members</h3>
      <form onSubmit={invite} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><input className="tr-in" type="email" required placeholder="Email address" aria-label="Email address" value={email} onChange={e => setEmail(e.target.value)} style={{ flex: "1 1 240px" }} />
        <select className="tr-in" aria-label="Role" value={role} onChange={e => setRole(e.target.value as typeof role)} style={{ width: 130 }}><option value="normal">Member</option><option value="admin">Admin</option></select><button className="tr-btn primary" style={{ height: 36 }} disabled={busy}>Invite</button></form>
      <p className="muted" style={{ fontSize: 13 }}>People who already have an account are added right away. Anyone else sees the invitation when they sign up with that email. TrelloIsDead doesn&apos;t send email, so share the link below if they need a nudge.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><Link2 size={16} />{link ? <><code style={{ fontSize: 12, wordBreak: "break-all" }}>{origin + link}</code><button className="tr-btn sm" onClick={() => void copyText(absUrl(link)).then(() => app.toast("Link copied."))}>Copy link</button><button className="tr-btn sm" onClick={() => makeLink(true)}>Reset link</button><button className="tr-btn sm subtle" onClick={killLink}>Disable link</button></> : <button className="tr-btn sm" onClick={() => makeLink()}>Create invite link</button>}</div>
    </section>}
    {admin && ws.invites.length > 0 && <section className="tr-sec"><h3 className="tr-h3">Pending invitations ({ws.invites.length})</h3><table className="tr-table"><tbody>{ws.invites.map(i => <tr key={i.email}><td>{i.email}</td><td className="muted">{i.role === "admin" ? "Admin" : "Member"} · invited by {i.by}</td><td style={{ textAlign: "right" }}><button className="tr-btn sm" onClick={() => cancel(i.email)}>Cancel</button></td></tr>)}</tbody></table></section>}
    <section className="tr-sec"><h3 className="tr-h3">Workspace members ({ws.members.length})</h3>
      <p className="muted" style={{ marginTop: -8 }}>Workspace members can view and join all Workspace-visible boards and create new boards in the Workspace.</p>
      <input className="tr-in" placeholder="Filter by name" aria-label="Filter members by name" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 280, marginBottom: 12 }} />
      <table className="tr-table" data-testid="ws-member-list"><tbody>{members.map(m => <tr key={m.id}><td style={{ width: 40 }}><Avatar p={m} /></td><td><b>{m.name}</b>{m.id === me && <span className="tr-pill" style={{ marginLeft: 6 }}>You</span>}<small className="muted" style={{ display: "block" }}>@{m.username}</small></td>
        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{admin && m.id !== me ? <select className="tr-in" aria-label={`Role for ${m.name}`} value={m.role} onChange={e => setMemberRole(m.id, e.target.value as "admin" | "normal")} style={{ width: 120, display: "inline-block" }}><option value="admin">Admin</option><option value="normal">Member</option></select> : <span className="tr-pill">{m.role === "admin" ? "Admin" : "Member"}</span>}
          {(admin || m.id === me) && <button className="tr-btn sm" style={{ marginLeft: 8 }} onClick={() => setMemberRole(m.id, null)}>{m.id === me ? <><LogOut size={14} />Leave</> : "Remove"}</button>}</td></tr>)}</tbody></table>
    </section>
  </main></div>;
}

export function WorkspaceSettings({ id }: { id: string }) {
  const { app, ws, me } = useWs(id); const router = useRouter(); const [form, setForm] = useState(() => ({ name: ws?.name ?? "", short: ws?.short ?? "", website: ws?.website ?? "", desc: ws?.desc ?? "", type: ws?.type ?? "" as WorkspaceType })); const [confirm, setConfirm] = useState(""); const [delOpen, setDelOpen] = useState(false);
  if (!ws) return <Missing />;
  const admin = ws.members.find(m => m.id === me)?.role === "admin";
  const save = async (p: Record<string, unknown>) => { try { const { workspace } = await app.call<{ workspace: Workspace }>("PATCH", `/api/workspaces/${id}`, p); app.setWorkspace(workspace); app.toast("Saved."); } catch (err) { app.toast((err as Error).message, { kind: "error" }); } };
  const del = async () => { try { await app.call("DELETE", `/api/workspaces/${id}`); await app.refresh(); router.push("/app"); } catch (err) { app.toast((err as Error).message, { kind: "error" }); } };
  return <div className="tr-page"><Sidebar /><main className="tr-main wide" data-testid="ws-settings"><WsHeader ws={ws} tab="settings" />
    {!admin && <p className="tr-invite">Only Workspace admins can change these settings.</p>}
    <form onSubmit={e => { e.preventDefault(); void save(form); }} style={{ maxWidth: 520 }} aria-disabled={!admin}>
      <h3 className="tr-h3">Workspace details</h3>
      <label className="tr-lbl" htmlFor="s-name">Name</label><input id="s-name" className="tr-in" value={form.name} disabled={!admin} onChange={e => setForm({ ...form, name: e.target.value })} maxLength={100} />
      <label className="tr-lbl" htmlFor="s-type">Workspace type</label><select id="s-type" className="tr-in" value={form.type} disabled={!admin} onChange={e => setForm({ ...form, type: e.target.value as WorkspaceType })}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <label className="tr-lbl" htmlFor="s-short">Short name</label><input id="s-short" className="tr-in" value={form.short} disabled={!admin} onChange={e => setForm({ ...form, short: e.target.value })} maxLength={40} />
      <label className="tr-lbl" htmlFor="s-web">Website <span className="muted" style={{ fontWeight: 400 }}>Optional</span></label><input id="s-web" className="tr-in" type="url" placeholder="https://" value={form.website} disabled={!admin} onChange={e => setForm({ ...form, website: e.target.value })} />
      <label className="tr-lbl" htmlFor="s-desc">Description <span className="muted" style={{ fontWeight: 400 }}>Optional</span></label><textarea id="s-desc" className="tr-in" value={form.desc} disabled={!admin} onChange={e => setForm({ ...form, desc: e.target.value })} maxLength={1000} />
      {admin && <button className="tr-btn primary" style={{ marginTop: 12 }} disabled={!form.name.trim()}>Save</button>}
    </form>
    <section className="tr-sec" style={{ marginTop: 32, maxWidth: 520 }}><h3 className="tr-h3">Workspace visibility</h3>
      <p className="muted">{ws.visibility === "private" ? <><Lock size={14} style={{ verticalAlign: -2 }} /> Private: this Workspace is private. It&apos;s not indexed or visible to those outside the Workspace.</> : <><Globe size={14} style={{ verticalAlign: -2 }} /> Public: anyone with the link can see this Workspace&apos;s name and description.</>}</p>
      {admin && <button className="tr-btn" onClick={() => save({ visibility: ws.visibility === "private" ? "public" : "private" })}>Make {ws.visibility === "private" ? "public" : "private"}</button>}
    </section>
    {admin && <section className="tr-sec" style={{ maxWidth: 520 }}><h3 className="tr-h3" style={{ color: "var(--danger)" }}>Delete this Workspace</h3>
      {!delOpen ? <button className="tr-btn" onClick={() => setDelOpen(true)}><Trash2 size={14} />Delete this Workspace?</button> :
        <div className="tr-invite" style={{ flexDirection: "column", alignItems: "stretch", background: "var(--danger-bg)" }}><b>Delete {ws.name}?</b><span style={{ fontSize: 13 }}>Boards in this Workspace and everything on them are deleted for everyone. There is no undo. Type the Workspace name to confirm.</span>
          <input className="tr-in" aria-label="Workspace name to confirm" value={confirm} onChange={e => setConfirm(e.target.value)} /><div style={{ display: "flex", gap: 8 }}><button className="tr-btn danger" disabled={confirm !== ws.name} onClick={del}>Delete Workspace</button><button className="tr-btn" onClick={() => { setDelOpen(false); setConfirm(""); }}>Cancel</button></div></div>}
    </section>}
  </main></div>;
}
