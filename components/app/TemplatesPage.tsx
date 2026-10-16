"use client";
// Template gallery: categories, the built-in templates, and boards your team marked as templates.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { LayoutTemplate, Search } from "lucide-react";
import { bgCss, labelColor, type Board } from "@/lib/model";
import { CATEGORIES, TEMPLATES, type Template } from "@/lib/templates";
import { useApp } from "@/components/app/AppProvider";
import { Sidebar } from "@/components/app/Sidebar";

function Preview({ t, onClose }: { t: Template; onClose: () => void }) {
  const app = useApp(); const router = useRouter(); const [title, setTitle] = useState(t.title); const [ws, setWs] = useState(app.workspaces[0]?.id ?? ""); const [busy, setBusy] = useState(false);
  const use = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true);
    try { const { board } = await app.call<{ board: Board }>("POST", "/api/boards", { title, template: t.id, workspaceId: ws }); await app.refresh(); router.push(`/app/b/${board.id}`); }
    catch (err) { app.toast((err as Error).message, { kind: "error" }); setBusy(false); } };
  return <div className="tr-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="tr-dialog wide" role="dialog" aria-modal="true" aria-labelledby="tp-h" style={{ maxWidth: 960 }}>
    <button className="tr-x" aria-label="Close" onClick={onClose}>×</button>
    <h2 id="tp-h">{t.title}</h2><p className="muted">{t.cat} · {t.desc}</p>
    <div style={{ background: bgCss(t.bg), borderRadius: 8, padding: 12, display: "flex", gap: 8, overflowX: "auto", marginBottom: 16 }} aria-label="Template preview">
      {t.lists.map(l => <div key={l.t} style={{ flex: "none", width: 200, background: "var(--list)", borderRadius: 10, padding: 8, alignSelf: "flex-start" }}><b style={{ fontSize: 13, display: "block", padding: "2px 4px 8px" }}>{l.t}</b>
        {l.cards.map(c => <div key={c.t} style={{ background: "var(--card)", borderRadius: 6, padding: "6px 8px", marginBottom: 6, boxShadow: "var(--card-shadow)", fontSize: 13 }}>
          {c.l && <span style={{ display: "flex", gap: 3, marginBottom: 4 }}>{c.l.map(i => <i key={i} style={{ width: 28, height: 6, borderRadius: 3, background: labelColor(t.labels[i]!.color).hex }} />)}</span>}{c.t}</div>)}</div>)}
    </div>
    <form onSubmit={use} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
      <div><label className="tr-lbl" htmlFor="tp-title">Board title</label><input id="tp-title" className="tr-in" value={title} onChange={e => setTitle(e.target.value)} required maxLength={512} /></div>
      <div><label className="tr-lbl" htmlFor="tp-ws">Workspace</label><select id="tp-ws" className="tr-in" value={ws} onChange={e => setWs(e.target.value)}>{app.workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
      <button className="tr-btn primary" disabled={busy || !title.trim()} style={{ height: 36 }}>{busy ? "Creating…" : "Use template"}</button>
    </form></div></div>;
}
export function TemplatesPage() {
  const app = useApp(); const sp = useSearchParams(); const router = useRouter();
  const [cat, setCat] = useState<string>(sp.get("cat") ?? "All"); const [q, setQ] = useState(""); const open = TEMPLATES.find(t => t.id === sp.get("t")) ?? null;
  const yours = app.boards.filter(b => b.isTemplate && !b.closed);
  const shown = useMemo(() => TEMPLATES.filter(t => (cat === "All" || t.cat === cat) && (!q.trim() || (t.title + " " + t.desc + " " + t.cat).toLowerCase().includes(q.trim().toLowerCase()))), [cat, q]);
  const setT = (id: string | null) => router.replace(id ? `/app/templates?t=${id}` : "/app/templates", { scroll: false });
  return <div className="tr-page"><Sidebar active="templates" />
    <main className="tr-main wide" data-testid="templates">
      <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 20, margin: "0 0 4px" }}><LayoutTemplate size={22} />Templates</h2>
      <p className="muted" style={{ marginTop: 0 }}>Start a board from a proven layout. Every template is a real board you can change.</p>
      <div style={{ position: "relative", maxWidth: 360, margin: "12px 0 16px" }}><Search size={16} style={{ position: "absolute", left: 10, top: 10, color: "var(--subtle)" }} /><input className="tr-in" aria-label="Search templates" placeholder="Search templates" value={q} onChange={e => setQ(e.target.value)} style={{ paddingLeft: 32 }} /></div>
      <div className="tr-cats" role="tablist" aria-label="Categories">{["All", ...CATEGORIES].map(c => <button key={c} role="tab" aria-selected={cat === c} className={cat === c ? "on" : ""} onClick={() => setCat(c)}>{c}</button>)}</div>
      {yours.length > 0 && cat === "All" && !q && <section className="tr-sec"><h3 className="tr-h3">Your Workspace templates</h3><div className="tr-tpls">{yours.map(b => <div key={b.id} className="tr-tpl"><Link className="tr-tpl__img" href={`/app/b/${b.id}`} style={{ background: bgCss(b.bg, true) }}><span className="tag">Template</span></Link>
        <div className="tr-tpl__body"><b>{b.title}</b><p>{app.workspaces.find(w => w.id === b.workspaceId)?.name ?? "Shared with you"}</p><Link className="tr-btn sm" href={`/app/b/${b.id}`}>Open template</Link></div></div>)}</div></section>}
      <div className="tr-tpls">{shown.map(t => <div key={t.id} className="tr-tpl" data-template={t.id}>
        <button className="tr-tpl__img" style={{ background: bgCss(t.bg, true), border: 0, cursor: "pointer" }} onClick={() => setT(t.id)} aria-label={`Preview ${t.title}`}><span className="tag">{t.cat}</span><span className="tr-tpl__mini">{t.lists.slice(0, 4).map(l => <i key={l.t} />)}</span></button>
        <div className="tr-tpl__body"><b>{t.title}</b><p>{t.desc}</p><button className="tr-btn sm" onClick={() => setT(t.id)}>Use template</button></div></div>)}
        {!shown.length && <p className="muted">No templates match “{q}”.</p>}</div>
      {open && <Preview t={open} onClose={() => setT(null)} />}
    </main></div>;
}
