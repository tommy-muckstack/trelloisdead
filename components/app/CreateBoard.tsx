"use client";
// Create board popover (title, background, Workspace, visibility, "Start with a template") and the shared
// background picker: Unsplash photos (self-hosted, credited), colours and gradients, or your own upload.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Users, Globe, Upload, MoreHorizontal } from "lucide-react";
import { COLORS, GRADIENTS, PHOTOS, bgCss, photoCredit, type Board, type Visibility } from "@/lib/model";
import { useApp } from "@/components/app/AppProvider";
import { track, EVENTS } from "@/lib/analytics";
import { PopHead } from "@/components/app/ui";

export const VIS: { v: Visibility; label: string; desc: string; Icon: typeof Lock }[] = [
  { v: "private", label: "Private", desc: "Only board members can see this board. Workspace admins can close the board or remove members.", Icon: Lock },
  { v: "workspace", label: "Workspace", desc: "All members of the Workspace can see and edit this board.", Icon: Users },
  { v: "public", label: "Public", desc: "Anyone on the internet can see this board. Only board members can edit.", Icon: Globe },
];
export function BoardGlyph() { return <svg width="186" height="103" viewBox="0 0 186 103" aria-hidden><rect x="30" y="16" width="38" height="70" rx="3" fill="#fff" fillOpacity=".9" /><rect x="74" y="16" width="38" height="52" rx="3" fill="#fff" fillOpacity=".9" /><rect x="118" y="16" width="38" height="34" rx="3" fill="#fff" fillOpacity=".9" /></svg>; }

/** Background chooser. `onPick` gets a background id ("p1015", "ocean", "c-blue", "u:<file id>"). */
export function BackgroundPicker({ value, onPick, compact, boardId }: { value: string; onPick: (bg: string) => void; compact?: boolean; boardId?: string }) {
  const app = useApp(); const [more, setMore] = useState<null | "photos" | "colors">(null); const [busy, setBusy] = useState(false); const file = useRef<HTMLInputElement>(null);
  const upload = async (f: File) => {
    setBusy(true); try { const fd = new FormData(); fd.append("file", f); fd.append("kind", "background"); if (boardId) fd.append("boardId", boardId); const r = await app.call<{ id: string }>("POST", "/api/files", fd); onPick("u:" + r.id); }
    catch (e) { app.toast((e as Error).message, { kind: "error" }); } finally { setBusy(false); }
  };
  const credit = photoCredit(value);
  if (more === "photos") return <div><button className="tr-btn sm subtle" onClick={() => setMore(null)}>‹ Back</button><h6 style={{ margin: "10px 0 6px" }}>Photos from Unsplash</h6>
    <div className="tr-bgs" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>{PHOTOS.map(p => <button key={p.id} type="button" aria-label={`Photo by ${p.author}`} title={`Photo by ${p.author}`} className={value === p.id ? "on" : ""} style={{ background: bgCss(p.id, true), height: 64 }} onClick={() => onPick(p.id)} />)}</div>
    <p className="tr-credit">Photos by Unsplash contributors, used under the Unsplash License.</p></div>;
  if (more === "colors") return <div><button className="tr-btn sm subtle" onClick={() => setMore(null)}>‹ Back</button><h6 style={{ margin: "10px 0 6px" }}>Colors</h6>
    <div className="tr-bgs" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>{[...GRADIENTS, ...COLORS].map(g => <button key={g.id} type="button" aria-label={g.name} title={g.name} className={value === g.id ? "on" : ""} style={{ background: g.css, height: 56 }} onClick={() => onPick(g.id)} />)}</div></div>;
  return <div>
    <div className="tr-bgs">{PHOTOS.slice(0, compact ? 4 : 8).map(p => <button key={p.id} type="button" aria-label={`Photo by ${p.author}`} title={`Photo by ${p.author}`} className={value === p.id ? "on" : ""} style={{ background: bgCss(p.id, true) }} onClick={() => onPick(p.id)} />)}</div>
    <div className="tr-bgs cols">{GRADIENTS.slice(0, 5).map(g => <button key={g.id} type="button" aria-label={g.name} title={g.name} className={value === g.id ? "on" : ""} style={{ background: g.css }} onClick={() => onPick(g.id)} />)}
      <button type="button" className="more" aria-label="More backgrounds" title="More backgrounds" onClick={() => setMore("colors")}><MoreHorizontal size={16} /></button></div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <button type="button" className="tr-btn sm" onClick={() => setMore("photos")}>All photos</button>
      <button type="button" className="tr-btn sm" disabled={busy} onClick={() => file.current?.click()}><Upload size={14} />{busy ? "Uploading…" : "Upload image"}</button>
      <input ref={file} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
    </div>
    {credit && <p className="tr-credit" style={{ marginTop: 6 }}>Photo by <a href={credit.source} target="_blank" rel="noopener noreferrer">{credit.author}</a> on Unsplash</p>}
  </div>;
}

export function CreateBoardPanel({ onClose, workspaceId, onBack }: { onClose: () => void; workspaceId?: string; onBack?: () => void }) {
  const app = useApp(); const router = useRouter();
  const [title, setTitle] = useState(""); const [bg, setBg] = useState(PHOTOS[0]!.id); const [ws, setWs] = useState(workspaceId ?? app.workspaces[0]?.id ?? ""); const [vis, setVis] = useState<Visibility>("workspace"); const [busy, setBusy] = useState(false); const [touched, setTouched] = useState(false);
  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setTouched(true); if (!title.trim() || !ws) return; setBusy(true);
    try { const { board } = await app.call<{ board: Board }>("POST", "/api/boards", { title, bg, workspaceId: ws, visibility: vis }); track(EVENTS.app_board_created, { template: false, visibility: vis }); await app.refresh(); onClose(); router.push(`/app/b/${board.id}`); }
    catch (err) { app.toast((err as Error).message, { kind: "error" }); setBusy(false); }
  };
  return <form onSubmit={create} data-testid="create-board">
    <PopHead title="Create board" onClose={onClose} onBack={onBack} />
    <div className="tr-cb__preview" style={{ background: bgCss(bg, true) }}><BoardGlyph /></div>
    <h6>Background</h6><BackgroundPicker value={bg} onPick={setBg} compact />
    <label className="tr-lbl" htmlFor="cb-title">Board title <span className="tr-req">*</span></label>
    <input id="cb-title" className="tr-in" autoFocus value={title} maxLength={512} onChange={e => setTitle(e.target.value)} onBlur={() => setTouched(true)} aria-invalid={touched && !title.trim()} />
    {touched && !title.trim() && <p style={{ margin: "4px 0 0", fontSize: 12 }}>👋 Board title is required</p>}
    <label className="tr-lbl" htmlFor="cb-ws">Workspace</label>
    <select id="cb-ws" className="tr-in" value={ws} onChange={e => setWs(e.target.value)}>{app.workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
    <label className="tr-lbl" htmlFor="cb-vis">Visibility</label>
    <select id="cb-vis" className="tr-in" value={vis} onChange={e => setVis(e.target.value as Visibility)}>{VIS.map(v => <option key={v.v} value={v.v}>{v.label}</option>)}</select>
    <p className="muted" style={{ fontSize: 12, margin: "4px 0 12px" }}>{VIS.find(v => v.v === vis)!.desc}</p>
    <button className="tr-btn primary full" disabled={busy || !title.trim()}>{busy ? "Creating…" : "Create"}</button>
    <Link href="/app/templates" className="tr-btn full" style={{ marginTop: 8 }} onClick={onClose}>Start with a template</Link>
  </form>;
}
