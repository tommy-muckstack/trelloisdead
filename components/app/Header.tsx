"use client";
// Global app header: logo, Workspaces / Recent / Starred / Templates menus, Create, and the right-hand cluster.
import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, Star, LayoutTemplate, Users, SquareKanban, Menu, Plus } from "lucide-react";
import { bgCss, type Workspace } from "@/lib/model";
import { TEMPLATES } from "@/lib/templates";
import { useApp } from "@/components/app/AppProvider";
import { Dropdown, PopHead, WsIcon } from "@/components/app/ui";
import { CreateBoardPanel } from "@/components/app/CreateBoard";
import { HeaderRight } from "@/components/app/HeaderRight";
import { Mark } from "@/components/Mark";

function BoardRow({ id, close }: { id: string; close: () => void }) {
  const app = useApp(); const b = app.boards.find(x => x.id === id); if (!b) return null; const ws = app.workspaces.find(w => w.id === b.workspaceId); const on = app.starred(id);
  return <div style={{ display: "flex", alignItems: "center" }}><Link className="tr-mi" href={`/app/b/${id}`} onClick={close} style={{ flex: 1 }}><span className="tr-mi__thumb" style={{ background: bgCss(b.bg, true) }} /><span><b style={{ fontWeight: 600 }}>{b.title}</b><small>{ws?.name ?? "Shared with you"}</small></span></Link>
    <button className="tr-ib" aria-label={on ? `Unstar ${b.title}` : `Star ${b.title}`} onClick={() => app.toggleStar(id)} style={{ color: on ? "#e2b203" : undefined, borderRadius: 3 }}><Star size={16} fill={on ? "currentColor" : "none"} /></button></div>;
}
export function WorkspacesMenu({ close }: { close: () => void }) {
  const app = useApp();
  return <><h6>Your Workspaces</h6>{app.workspaces.map(w => <Link key={w.id} className="tr-mi" href={`/app/w/${w.id}`} onClick={close}><WsIcon ws={w} /><span>{w.name}</span></Link>)}</>;
}
export function RecentMenu({ close }: { close: () => void }) {
  const app = useApp(); const ids = app.user.recent.map(r => r.id).filter(id => app.boards.some(b => b.id === id && !b.closed));
  return ids.length ? <>{ids.slice(0, 8).map(id => <BoardRow key={id} id={id} close={close} />)}</> : <p className="muted" style={{ margin: 0 }}>Boards you open show up here.</p>;
}
export function StarredMenu({ close }: { close: () => void }) {
  const app = useApp(); const ids = app.user.starred.filter(id => app.boards.some(b => b.id === id && !b.closed));
  return ids.length ? <>{ids.map(id => <BoardRow key={id} id={id} close={close} />)}</> : <div style={{ textAlign: "center" }}><Star size={32} style={{ color: "var(--subtlest)" }} /><p className="muted" style={{ margin: "8px 0 0" }}>Star important boards to access them quickly and easily.</p></div>;
}
export function TemplatesMenu({ close }: { close: () => void }) {
  return <><h6>Top templates</h6>{TEMPLATES.slice(0, 6).map(t => <Link key={t.id} className="tr-mi" href={`/app/templates?t=${t.id}`} onClick={close}><span className="tr-mi__thumb" style={{ background: bgCss(t.bg, true) }} /><span>{t.title}<small>{t.cat}</small></span></Link>)}
    <hr className="tr-sep" /><Link className="tr-mi" href="/app/templates" onClick={close}><LayoutTemplate size={16} />Explore templates</Link></>;
}

export function CreateWorkspaceDialog({ onClose }: { onClose: () => void }) {
  const app = useApp(); const router = useRouter(); const [name, setName] = useState(""); const [type, setType] = useState(""); const [desc, setDesc] = useState(""); const [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => { e.preventDefault(); if (!name.trim()) return; setBusy(true);
    try { const { workspace } = await app.call<{ workspace: Workspace }>("POST", "/api/workspaces", { name, type, desc }); await app.refresh(); onClose(); router.push(`/app/w/${workspace.id}`); }
    catch (err) { app.toast((err as Error).message, { kind: "error" }); setBusy(false); } };
  return <div className="tr-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><form className="tr-dialog" role="dialog" aria-modal="true" aria-labelledby="cw-h" onSubmit={go}>
    <button type="button" className="tr-x" aria-label="Close" onClick={onClose}>×</button>
    <h2 id="cw-h">Let&apos;s build a Workspace</h2><p className="muted">Boost your productivity by making it easier for everyone to access boards in one location.</p>
    <label className="tr-lbl" htmlFor="cw-name">Workspace name</label><input id="cw-name" className="tr-in" autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="Taco's Co." />
    <label className="tr-lbl" htmlFor="cw-type">Workspace type</label>
    <select id="cw-type" className="tr-in" value={type} onChange={e => setType(e.target.value)}><option value="">Choose…</option>{[["education", "Education"], ["engineering", "Engineering-IT"], ["hr", "Human Resources"], ["marketing", "Marketing"], ["operations", "Operations"], ["sales", "Sales CRM"], ["small-business", "Small Business"], ["other", "Other"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    <label className="tr-lbl" htmlFor="cw-desc">Workspace description <span className="muted" style={{ fontWeight: 400 }}>Optional</span></label><textarea id="cw-desc" className="tr-in" value={desc} onChange={e => setDesc(e.target.value)} maxLength={1000} placeholder="Our team organizes everything here." />
    <div className="row"><button className="tr-btn primary full" disabled={busy || !name.trim()}>{busy ? "Creating…" : "Continue"}</button></div>
  </form></div>;
}

function CreateMenu({ close }: { close: () => void }) {
  const [mode, setMode] = useState<"menu" | "board">("menu"); const [ws, setWs] = useState(false);
  if (ws) return <CreateWorkspaceDialog onClose={() => { setWs(false); close(); }} />;
  if (mode === "board") return <CreateBoardPanel onClose={close} onBack={() => setMode("menu")} />;
  return <>
    <button className="tr-mi" onClick={() => setMode("board")}><SquareKanban size={16} /><span>Create board<small>A board is made up of cards ordered on lists. Use it to manage projects, track information, or organize anything.</small></span></button>
    <Link className="tr-mi" href="/app/templates" onClick={close}><LayoutTemplate size={16} /><span>Start with a template<small>Get started faster with a board template.</small></span></Link>
    <button className="tr-mi" onClick={() => setWs(true)}><Users size={16} /><span>Create Workspace<small>A Workspace is a group of boards and people. Use it to organize your company, side hustle, family, or friends.</small></span></button>
  </>;
}

export function Header() {
  const path = usePathname(); const onBoard = path.includes("/app/b/");
  return <header className="tr-hd" data-testid="app-header">
    <Link href="/app" className="tr-hd__logo" aria-label="TrelloIsDead boards"><Mark size={22} />TrelloIsDead</Link>
    <nav className="tr-hd__nav" aria-label="Main">
      <Dropdown label={<>Workspaces <ChevronDown size={14} /></>}>{close => <WorkspacesMenu close={close} />}</Dropdown>
      <Dropdown label={<>Recent <ChevronDown size={14} /></>} wide>{close => <RecentMenu close={close} />}</Dropdown>
      <Dropdown label={<>Starred <ChevronDown size={14} /></>} wide>{close => <StarredMenu close={close} />}</Dropdown>
      <Dropdown label={<>Templates <ChevronDown size={14} /></>} wide>{close => <TemplatesMenu close={close} />}</Dropdown>
    </nav>
    <Dropdown className="tr-hd__more" label={<><Menu size={16} /><span className="sr">More</span></>} title="More">{close => <MoreMenu close={close} />}</Dropdown>
    <div className="tr-hd__create"><Dropdown className="tr-btn primary" testid="create" label={<><Plus size={16} /><span className="lbl">Create</span></>} wide>{close => <CreateMenu close={close} />}</Dropdown></div>
    <div className="tr-hd__sp" data-onboard={onBoard || undefined} />
    <HeaderRight />
  </header>;
}
function MoreMenu({ close }: { close: () => void }) {
  const [tab, setTab] = useState<null | "ws" | "recent" | "starred" | "templates">(null);
  if (tab) return <><PopHead title={{ ws: "Workspaces", recent: "Recent boards", starred: "Starred boards", templates: "Templates" }[tab]} onClose={close} onBack={() => setTab(null)} />
    {tab === "ws" ? <WorkspacesMenu close={close} /> : tab === "recent" ? <RecentMenu close={close} /> : tab === "starred" ? <StarredMenu close={close} /> : <TemplatesMenu close={close} />}</>;
  return <>{([["ws", "Workspaces"], ["recent", "Recent"], ["starred", "Starred"], ["templates", "Templates"]] as const).map(([k, l]) => <button key={k} className="tr-mi" onClick={() => setTab(k)}>{l}<span className="end">›</span></button>)}</>;
}
