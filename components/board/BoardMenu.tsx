"use client";
// The board "⋯" menu: a drawer with About, Activity, Archived items, Settings, background, labels, copy,
// export/print, template toggle, close and leave.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Info, Activity as ActivityIcon, Archive, Settings, Image as ImageIcon, Tag, Copy, Download, LayoutTemplate, X, ChevronLeft, LogOut, Pencil, Trash2, Undo2 } from "lucide-react";
import { LABEL_COLORS, ago, labelColor, uid, type Board } from "@/lib/model";
import { useApp } from "@/components/app/AppProvider";
import { useBoard } from "@/components/app/BoardProvider";
import { Avatar } from "@/components/app/ui";
import { BackgroundPicker } from "@/components/app/CreateBoard";
import { Markdown, MdEditor } from "@/components/board/Markdown";

export type MenuView = "main" | "about" | "activity" | "archived" | "settings" | "background" | "labels" | "copy" | "export" | "close";
export function BoardMenu({ view, setView, onClose }: { view: MenuView; setView: (v: MenuView) => void; onClose: () => void }) {
  const { board, role } = useBoard(); const admin = role === "admin";
  const titles: Record<MenuView, string> = { main: "Menu", about: "About this board", activity: "Activity", archived: "Archived items", settings: "Settings", background: "Change background", labels: "Labels", copy: "Copy board", export: "Print, export, and share", close: "Close board?" };
  return <aside className="b-menu" aria-label="Board menu" data-testid="board-menu">
    <div className="b-menu__hd">{view !== "main" ? <button className="tr-ib" aria-label="Back" onClick={() => setView("main")}><ChevronLeft size={18} /></button> : <span style={{ width: 32 }} />}<b>{titles[view]}</b><button className="tr-ib" aria-label="Close menu" onClick={onClose}><X size={18} /></button></div>
    <div className="b-menu__body">
      {view === "main" && <MainMenu setView={setView} />}
      {view === "about" && <About />}{view === "activity" && <ActivityFeed />}{view === "archived" && <Archived />}{view === "settings" && <BoardSettings />}
      {view === "background" && (role && role !== "observer" ? <Background /> : <p className="muted">Only board members can change the background.</p>)}
      {view === "labels" && <Labels />}{view === "copy" && <CopyBoard />}{view === "export" && <Export />}{view === "close" && admin && <CloseBoard onDone={onClose} />}
      {!board.id && null}
    </div></aside>;
}
function MainMenu({ setView }: { setView: (v: MenuView) => void }) {
  const { board, role, dispatch, me } = useBoard(); const router = useRouter(); const admin = role === "admin"; const editable = !!role && role !== "observer";
  const item = (v: MenuView, Icon: typeof Info, label: string, sub?: string) => <button className="tr-mi" onClick={() => setView(v)}><Icon size={16} /><span>{label}{sub && <small>{sub}</small>}</span></button>;
  const lastAdmin = admin && board.members.filter(m => m.role === "admin").length < 2;
  return <>
    {item("about", Info, "About this board", "Add a description to your board")}{item("activity", ActivityIcon, "Activity")}{item("archived", Archive, "Archived items")}
    <hr className="tr-sep" />
    {item("settings", Settings, "Settings")}{editable && item("background", ImageIcon, "Change background")}{item("labels", Tag, "Labels")}
    <hr className="tr-sep" />
    {editable && item("copy", Copy, "Copy board")}{item("export", Download, "Print, export, and share")}
    {admin && <button className="tr-mi" onClick={() => dispatch({ t: "board.patch", patch: { isTemplate: !board.isTemplate } })}><LayoutTemplate size={16} /><span>{board.isTemplate ? "Convert to a regular board" : "Make template"}<small>{board.isTemplate ? "People will be able to edit it again." : "Make it easy for others to get started by turning this board into a template."}</small></span></button>}
    {admin && !board.closed && <button className="tr-mi danger" onClick={() => setView("close")}><Archive size={16} />Close board</button>}
    {role && <button className="tr-mi" disabled={lastAdmin} title={lastAdmin ? "Make someone else an admin before leaving." : undefined} onClick={() => { dispatch({ t: "member.remove", userId: me }, { undoable: false }); setTimeout(() => router.push("/app"), 400); }}><LogOut size={16} />Leave board</button>}
  </>;
}
function About() {
  const { board, editable } = useBoard(); const { dispatch } = useBoard(); const [edit, setEdit] = useState(false);
  const admins = board.members.filter(m => m.role === "admin");
  return <>
    <h6>Board admins</h6>{admins.map(m => <div key={m.id} className="b-mrow"><Avatar p={m} size="lg" /><div className="grow"><b>{m.name}</b><small className="muted">@{m.username}</small></div></div>)}
    <h6 style={{ display: "flex", alignItems: "center", gap: 8 }}>Description {editable && !edit && <button className="tr-btn sm" onClick={() => setEdit(true)}><Pencil size={12} />Edit</button>}</h6>
    {edit ? <MdEditor initial={board.desc} label="Board description" placeholder="Add a description to let your teammates know what this board is used for. You'll get bonus points if you add instructions for how to collaborate!" onCancel={() => setEdit(false)} onSave={v => { dispatch({ t: "board.patch", patch: { desc: v } }); setEdit(false); }} />
      : board.desc ? <Markdown text={board.desc} usernames={board.members.map(m => m.username)} /> : <p className="muted">{editable ? "Add a description to let your teammates know what this board is used for." : "No description."}</p>}
    <h6>Visibility</h6><p className="muted" style={{ marginTop: 0 }}>{board.visibility === "private" ? "Private: only board members can see and edit this board." : board.visibility === "workspace" ? "Workspace: all members of the Workspace can see and edit this board." : "Public: anyone on the internet can see this board. Only board members can edit."}</p>
  </>;
}
export function ActivityFeed({ cardId }: { cardId?: string }) {
  const { board } = useBoard(); const items = cardId ? board.activity.filter(a => a.cardId === cardId) : board.activity;
  if (!items.length) return <p className="muted">No activity yet.</p>;
  return <ul className="b-activity">{items.slice(0, 200).map(a => { const m = board.members.find(x => x.id === a.by);
    return <li key={a.id}><Avatar p={m ?? { id: a.by, name: a.byName, initials: a.byName.slice(0, 1).toUpperCase(), color: "" }} size="sm" /><div><b>{a.byName}</b> {cardId ? a.ctext || a.text : a.cardId && !cardId ? <Link href={`/app/b/${board.id}?card=${a.cardId}`} scroll={false}>{a.text}</Link> : a.text}<small className="muted" style={{ display: "block" }}>{ago(a.at)}</small></div></li>; })}</ul>;
}
function Archived() {
  const { board, dispatch, role, editable } = useBoard(); const [mode, setMode] = useState<"cards" | "lists">("cards"); const [q, setQ] = useState(""); const [confirm, setConfirm] = useState<string | null>(null);
  const cards = board.lists.flatMap(l => l.cards.filter(c => c.archived || l.archived).map(c => ({ c, l }))).filter(({ c }) => c.archived && (!q.trim() || c.title.toLowerCase().includes(q.trim().toLowerCase())));
  const lists = board.lists.filter(l => l.archived && (!q.trim() || l.title.toLowerCase().includes(q.trim().toLowerCase())));
  return <div data-testid="archived">
    <div style={{ display: "flex", gap: 8 }}><input className="tr-in" aria-label="Search archive" placeholder="Search archive…" value={q} onChange={e => setQ(e.target.value)} /><button className="tr-btn" onClick={() => setMode(m => (m === "cards" ? "lists" : "cards"))} style={{ height: 36 }}>{mode === "cards" ? "Switch to lists" : "Switch to cards"}</button></div>
    {mode === "cards" ? <>{!cards.length && <p className="muted">No archived cards{q ? " match" : ""}.</p>}
      {cards.map(({ c, l }) => <div key={c.id} className="b-archcard"><Link href={`/app/b/${board.id}?card=${c.id}`} scroll={false} className="b-archcard__card">{c.title}<small className="muted">in {l.title}{l.archived ? " (archived list)" : ""}</small></Link>
        {editable && <div className="b-archcard__acts">{confirm === c.id ? <><span className="muted" style={{ fontSize: 12 }}>Delete forever? There&apos;s no undo.</span><button className="tr-btn sm danger" onClick={() => { dispatch({ t: "card.delete", cardId: c.id }, { undoable: false }); setConfirm(null); }}>Delete</button><button className="tr-btn sm" onClick={() => setConfirm(null)}>Cancel</button></>
          : <><button className="tr-btn sm" onClick={() => { dispatch({ t: "card.patch", cardId: c.id, patch: { archived: false } }); if (l.archived) dispatch({ t: "list.patch", listId: l.id, archived: false }); }}><Undo2 size={13} />Restore</button><button className="tr-btn sm" onClick={() => setConfirm(c.id)}><Trash2 size={13} />Delete</button></>}</div>}</div>)}</>
      : <>{!lists.length && <p className="muted">No archived lists{q ? " match" : ""}.</p>}
        {lists.map(l => <div key={l.id} className="b-arch"><span>{l.title} <small className="muted">{l.cards.filter(c => !c.archived).length} cards</small></span>{editable && <button className="tr-btn sm" onClick={() => dispatch({ t: "list.patch", listId: l.id, archived: false })}><Undo2 size={13} />Restore</button>}</div>)}
        {role === "admin" && lists.length > 0 && <p className="muted" style={{ fontSize: 12 }}>Archived lists can be restored at any time. To remove a list's cards for good, restore the list, archive its cards and delete them here.</p>}</>}
  </div>;
}
function BoardSettings() {
  const app = useApp(); const { board, role, dispatch, replace } = useBoard(); const admin = role === "admin";
  const move = async (ws: string) => { try { const { board: b } = await app.call<{ board: Board }>("POST", `/api/b/${board.id}/move`, { workspaceId: ws }); replace(b); await app.refresh(); app.toast(`Moved to ${app.workspaces.find(w => w.id === ws)?.name}.`); } catch (e) { app.toast((e as Error).message, { kind: "error" }); } };
  return <div data-testid="board-settings">
    <label className="tr-lbl" htmlFor="bs-ws">Workspace</label>
    <select id="bs-ws" className="tr-in" disabled={!admin} value={board.workspaceId} onChange={e => void move(e.target.value)}>{!app.workspaces.some(w => w.id === board.workspaceId) && <option value={board.workspaceId}>Another Workspace</option>}{app.workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
    <label className="tr-lbl" htmlFor="bs-com">Commenting permissions</label>
    <select id="bs-com" className="tr-in" disabled={!admin} value={board.settings.comments} onChange={e => dispatch({ t: "board.patch", patch: { settings: { comments: e.target.value as Board["settings"]["comments"] } } })}><option value="disabled">Disabled</option><option value="members">Members</option><option value="observers">Members and observers</option><option value="workspace">Workspace members</option></select>
    <label className="tr-check" style={{ marginTop: 16 }}><input type="checkbox" disabled={!admin} checked={board.settings.covers} onChange={e => dispatch({ t: "board.patch", patch: { settings: { covers: e.target.checked } } })} />Card covers enabled<span className="muted" style={{ fontSize: 12 }}>(show images and colours on the front of cards)</span></label>
    <label className="tr-check" style={{ marginTop: 12 }}><input type="checkbox" disabled={!admin} checked={board.settings.completeOnFront} onChange={e => dispatch({ t: "board.patch", patch: { settings: { completeOnFront: e.target.checked } } })} />Show complete status on the front of cards</label>
    {!admin && <p className="muted" style={{ fontSize: 12 }}>Only board admins can change these settings.</p>}
  </div>;
}
function Background() { const { board, dispatch } = useBoard(); return <BackgroundPicker value={board.bg} boardId={board.id} onPick={bg => dispatch({ t: "board.patch", patch: { bg } })} />; }
export function Labels({ onPick, selected }: { onPick?: (labelId: string) => void; selected?: string[] }) {
  const { board, dispatch, editable } = useBoard(); const [edit, setEdit] = useState<{ id: string | null; name: string; color: string } | null>(null); const [q, setQ] = useState(""); const [confirm, setConfirm] = useState(false);
  const shown = board.labels.filter(l => !q.trim() || (l.name + " " + labelColor(l.color).name).toLowerCase().includes(q.trim().toLowerCase()));
  if (edit) return <div data-testid="label-editor">
    <div className={"b-label lc-" + edit.color} style={{ height: 32, width: "100%", fontSize: 14, marginBottom: 12 }}>{edit.name}</div>
    <label className="tr-lbl" htmlFor="lbl-name">Title</label><input id="lbl-name" className="tr-in" autoFocus value={edit.name} maxLength={100} onChange={e => setEdit({ ...edit, name: e.target.value })} />
    <label className="tr-lbl">Select a color</label><div className="b-colors">{LABEL_COLORS.map(c => <button key={c.id} type="button" aria-label={c.name} title={c.name} aria-pressed={edit.color === c.id} className={"lc-" + c.id + (edit.color === c.id ? " on" : "")} onClick={() => setEdit({ ...edit, color: c.id })} />)}</div>
    <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button className="tr-btn primary" onClick={() => { if (edit.id) dispatch({ t: "label.update", labelId: edit.id, name: edit.name, color: edit.color }); else { const id = uid("L"); dispatch({ t: "label.create", labelId: id, name: edit.name, color: edit.color }); onPick?.(id); } setEdit(null); }}>{edit.id ? "Save" : "Create"}</button>
      {edit.id && (confirm ? <><button className="tr-btn danger" onClick={() => { dispatch({ t: "label.delete", labelId: edit.id! }, { undoable: false }); setEdit(null); setConfirm(false); }}>Delete label</button><span className="muted" style={{ fontSize: 12 }}>It's removed from every card. No undo.</span></> : <button className="tr-btn" style={{ marginLeft: "auto" }} onClick={() => setConfirm(true)}>Delete</button>)}
      <button className="tr-btn subtle" onClick={() => { setEdit(null); setConfirm(false); }}>Cancel</button></div>
  </div>;
  return <div data-testid="labels">
    <input className="tr-in" aria-label="Search labels" placeholder="Search labels…" value={q} onChange={e => setQ(e.target.value)} />
    <h6 style={{ marginTop: 12 }}>Labels</h6>
    {shown.map(l => <div key={l.id} className="b-lblrow">
      {onPick && <input type="checkbox" aria-label={`Label ${l.name || labelColor(l.color).name}`} checked={!!selected?.includes(l.id)} onChange={() => onPick(l.id)} disabled={!editable} />}
      <button className={"b-label big lc-" + l.color} onClick={() => (onPick && editable ? onPick(l.id) : undefined)} title={labelColor(l.color).name} aria-label={`${l.name || labelColor(l.color).name} label`}>{l.name}</button>
      {editable && <button className="tr-ib" aria-label={`Edit ${l.name || labelColor(l.color).name} label`} style={{ borderRadius: 3 }} onClick={() => setEdit({ id: l.id, name: l.name, color: l.color })}><Pencil size={14} /></button>}</div>)}
    {editable && <button className="tr-btn full" style={{ marginTop: 8 }} onClick={() => setEdit({ id: null, name: q, color: "green" })}>Create a new label</button>}
  </div>;
}
function CopyBoard() {
  const app = useApp(); const { board } = useBoard(); const router = useRouter(); const [title, setTitle] = useState(board.title + " (copy)"); const [ws, setWs] = useState(app.workspaces.some(w => w.id === board.workspaceId) ? board.workspaceId : app.workspaces[0]?.id ?? ""); const [keep, setKeep] = useState(true); const [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); try { const { board: b } = await app.call<{ board: Board }>("POST", "/api/boards", { title, workspaceId: ws, fromBoard: board.id, keepCards: keep }); await app.refresh(); router.push(`/app/b/${b.id}`); } catch (err) { app.toast((err as Error).message, { kind: "error" }); setBusy(false); } };
  return <form onSubmit={go}><label className="tr-lbl" htmlFor="cp-t">Title</label><input id="cp-t" className="tr-in" value={title} onChange={e => setTitle(e.target.value)} required maxLength={512} />
    <label className="tr-lbl" htmlFor="cp-w">Workspace</label><select id="cp-w" className="tr-in" value={ws} onChange={e => setWs(e.target.value)}>{app.workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
    <label className="tr-check" style={{ margin: "12px 0" }}><input type="checkbox" checked={keep} onChange={e => setKeep(e.target.checked)} />Keep cards</label>
    <p className="muted" style={{ fontSize: 12 }}>Activity, comments and members will not be copied to the new board.</p>
    <button className="tr-btn primary full" disabled={busy || !title.trim()}>{busy ? "Copying…" : "Create"}</button></form>;
}
const download = (name: string, type: string, text: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
export const csvCell = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function Export() {
  const { board } = useBoard(); const slug = useMemo(() => board.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "board", [board.title]);
  const csv = () => { const rows = [["Card #", "Title", "List", "Labels", "Members", "Start", "Due", "Complete", "Description", "Archived"], ...board.lists.flatMap(l => l.cards.map(c => [c.num, c.title, l.title, c.labels.map(id => board.labels.find(x => x.id === id)?.name || board.labels.find(x => x.id === id)?.color).join("; "), c.members.map(id => board.members.find(m => m.id === id)?.name).join("; "), c.start ?? "", c.due ?? "", c.dueComplete ? "yes" : "", c.desc, c.archived || l.archived ? "yes" : ""]))];
    download(`${slug}.csv`, "text/csv", rows.map(r => r.map(csvCell).join(",")).join("\n")); };
  return <><button className="tr-mi" onClick={() => window.print()}>Print<small style={{ display: "inline", marginLeft: 6 }}>the board as it looks now</small></button>
    <button className="tr-mi" onClick={() => download(`${slug}.json`, "application/json", JSON.stringify(board, null, 2))}>Export as JSON</button>
    <button className="tr-mi" onClick={csv}>Export as CSV</button>
    <p className="muted" style={{ fontSize: 12 }}>Exports include archived cards and lists. JSON keeps everything: lists, cards, checklists, comments, labels and activity.</p></>;
}
function CloseBoard({ onDone }: { onDone: () => void }) {
  const { dispatch } = useBoard();
  return <><p>You can find and reopen closed boards at the bottom of <Link href="/app">your boards page</Link>.</p><button className="tr-btn danger full" onClick={() => { dispatch({ t: "board.patch", patch: { closed: true } }); onDone(); }}>Close</button></>;
}
