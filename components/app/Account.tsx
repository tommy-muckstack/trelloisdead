"use client";
// Account menu (avatar), keyboard-shortcuts panel and the profile / activity / cards / settings pages.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { User, Activity, CreditCard, Settings, Sun, Moon, Monitor, Keyboard, LogOut, LogIn, HelpCircle } from "lucide-react";
import { ago, bgCss, fmtText, AVATAR_COLORS, type Theme } from "@/lib/model";
import { BP } from "@/lib/basepath";
import { trackNow, resetIdentity, EVENTS } from "@/lib/analytics";
import { useApp } from "@/components/app/AppProvider";
import { Avatar, PopHead, useDismiss } from "@/components/app/ui";
import { DueBadge, type MyCard } from "@/components/app/HomePage";
import { SHORTCUTS } from "@/components/app/shortcuts-data";

export const openShortcuts = () => window.dispatchEvent(new Event("trelloisdead:shortcuts"));
export function AccountMenu() {
  const app = useApp(); const [open, setOpen] = useState(false); const [theme, setTheme] = useState(false); const ref = useRef<HTMLDivElement>(null); useDismiss(ref, () => { setOpen(false); setTheme(false); }, open);
  const u = app.user; const close = () => { setOpen(false); setTheme(false); };
  const next = typeof window !== "undefined" ? encodeURIComponent(window.location.pathname) : "";
  return <div className="tr-dd" ref={ref} data-testid="account">
    <button className="tr-avbtn" aria-label={`Account: ${u.name}`} aria-expanded={open} onClick={() => setOpen(o => !o)}><Avatar p={u} /></button>
    {open && <div className="tr-pop right" role="menu" aria-label="Account">
      {theme ? <><PopHead title="Theme" onClose={close} onBack={() => setTheme(false)} />{([["light", "Light", Sun], ["dark", "Dark", Moon], ["system", "Match browser", Monitor]] as [Theme, string, typeof Sun][]).map(([v, l, I]) => <button key={v} className={"tr-mi" + (u.settings.theme === v ? " on" : "")} role="menuitemradio" aria-checked={u.settings.theme === v} onClick={() => app.patchMe({ settings: { theme: v } })}><I size={16} />{l}{u.settings.theme === v && <span className="end">✓</span>}</button>)}</>
      : <>
        <h6>Account</h6>
        <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "4px 0 8px" }}><Avatar p={u} size="lg" /><div style={{ minWidth: 0 }}><b>{u.name}</b><div className="muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis" }}>{app.session.guest ? "Guest: nothing is linked to an email yet" : u.email}</div></div></div>
        {app.session.guest && <><a className="tr-mi" href={`${BP}/signup?callbackUrl=${next}`}><LogIn size={16} />Sign up to keep your work</a><a className="tr-mi" href={`${BP}/login?callbackUrl=${next}`}><LogIn size={16} />Log in</a></>}
        <hr className="tr-sep" /><h6>TrelloIsDead</h6>
        <Link className="tr-mi" href="/app/u/profile" onClick={close}><User size={16} />Profile and visibility</Link>
        <Link className="tr-mi" href="/app/u/activity" onClick={close}><Activity size={16} />Activity</Link>
        <Link className="tr-mi" href="/app/u/cards" onClick={close}><CreditCard size={16} />Cards</Link>
        <Link className="tr-mi" href="/app/u/settings" onClick={close}><Settings size={16} />Settings</Link>
        <button className="tr-mi" onClick={() => setTheme(true)}><Sun size={16} />Theme<span className="end">›</span></button>
        <hr className="tr-sep" />
        <a className="tr-mi" href={`${BP}/help`}><HelpCircle size={16} />Help</a>
        <button className="tr-mi" onClick={() => { close(); openShortcuts(); }}><Keyboard size={16} />Shortcuts</button>
        {!app.session.guest && <><hr className="tr-sep" /><form method="post" action={`${BP}/api/session/logout`} style={{ margin: 0 }} onSubmit={e => { e.preventDefault(); const f = e.currentTarget; void trackNow(EVENTS.app_signed_out).then(() => { resetIdentity(); f.submit(); }); }}><button className="tr-mi"><LogOut size={16} />Log out</button></form></>}
      </>}
    </div>}
  </div>;
}

export function ShortcutsDialog() {
  const app = useApp(); const [open, setOpen] = useState(false);
  useEffect(() => { const h = () => setOpen(true); window.addEventListener("trelloisdead:shortcuts", h); return () => window.removeEventListener("trelloisdead:shortcuts", h); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !e.defaultPrevented) { e.preventDefault(); setOpen(false); return; }
      if (!app.user.settings.shortcuts || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return; const t = e.target as HTMLElement; if (t.closest("input,textarea,select,[contenteditable=true]")) return;
      if (e.key === "?") { e.preventDefault(); setOpen(o => !o); }
      else if (e.key === "/") { e.preventDefault(); window.dispatchEvent(new Event("trelloisdead:search")); }
      else if (e.key.toLowerCase() === "b" && !document.querySelector(".tr-scrim")) { e.preventDefault(); window.dispatchEvent(new Event("trelloisdead:search")); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [open, app.user.settings.shortcuts]);
  if (!open) return null;
  return <div className="tr-scrim" onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}><div className="tr-dialog wide" role="dialog" aria-modal="true" aria-labelledby="sc-h" data-testid="shortcuts">
    <button className="tr-x" aria-label="Close" onClick={() => setOpen(false)}>×</button><h2 id="sc-h"><Keyboard size={20} style={{ verticalAlign: -4 }} /> Keyboard shortcuts</h2>
    {!app.user.settings.shortcuts && <p className="tr-invite">Shortcuts are turned off. Turn them on in <Link href="/app/u/settings" onClick={() => setOpen(false)}>Settings</Link>.</p>}
    <table className="tr-table"><tbody>{SHORTCUTS.map(([k, d]) => <tr key={k}><td style={{ width: 200 }}><kbd className="tr-kbd">{k}</kbd></td><td>{d}</td></tr>)}</tbody></table>
  </div></div>;
}

function UserTabs({ tab }: { tab: string }) {
  const app = useApp();
  return <><div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}><Avatar p={app.user} size="xl" /><div><h1 style={{ margin: 0, fontSize: 24 }}>{app.user.name}</h1><span className="muted">@{app.user.username}</span></div></div>
    <nav className="tr-tabs" aria-label="Account">{[["profile", "Profile and visibility"], ["activity", "Activity"], ["cards", "Cards"], ["settings", "Settings"]].map(([k, l]) => <Link key={k} href={`/app/u/${k}`} className={tab === k ? "on" : ""}>{l}</Link>)}</nav></>;
}
export function UserPage({ tab }: { tab: string }) {
  return <main className="tr-main" style={{ margin: "0 auto", maxWidth: 860 }} data-testid={`user-${tab}`}><UserTabs tab={tab} />
    {tab === "profile" ? <Profile /> : tab === "activity" ? <MyActivity /> : tab === "cards" ? <MyCards /> : <SettingsTab />}</main>;
}
function Profile() {
  const app = useApp(); const u = app.user; const [f, setF] = useState({ name: u.name, username: u.username, bio: u.bio }); const [busy, setBusy] = useState(false); const file = useRef<HTMLInputElement>(null);
  const save = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); await app.patchMe(f); setBusy(false); app.toast("Profile saved."); };
  const upload = async (fl: File) => { try { const fd = new FormData(); fd.append("file", fl); fd.append("kind", "avatar"); const r = await app.call<{ url: string }>("POST", "/api/files", fd); await app.patchMe({ avatar: r.url }); } catch (e) { app.toast((e as Error).message, { kind: "error" }); } };
  return <div style={{ maxWidth: 520 }}>
    <h2 className="tr-h3">Profile photo</h2>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}><Avatar p={u} size="lg" /><button className="tr-btn" onClick={() => file.current?.click()}>Upload a photo</button>{u.avatar && <button className="tr-btn subtle" onClick={() => app.patchMe({ avatar: null })}>Remove photo</button>}
      <input ref={file} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden aria-label="Upload a profile photo" onChange={e => { const fl = e.target.files?.[0]; if (fl) void upload(fl); e.target.value = ""; }} /></div>
    {!u.avatar && <div style={{ display: "flex", gap: 6, marginTop: 10 }} role="radiogroup" aria-label="Avatar colour">{AVATAR_COLORS.map(c => <button key={c} role="radio" aria-checked={u.color === c} aria-label={`Avatar colour ${c}`} onClick={() => app.patchMe({ color: c })} style={{ width: 24, height: 24, borderRadius: "50%", border: u.color === c ? "2px solid var(--text)" : "2px solid transparent", background: c, cursor: "pointer" }} />)}</div>}
    <h2 className="tr-h3" style={{ marginTop: 28 }}>About</h2>
    <form onSubmit={save}>
      <label className="tr-lbl" htmlFor="pf-name">Full name</label><input id="pf-name" className="tr-in" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} maxLength={100} required />
      <label className="tr-lbl" htmlFor="pf-user">Username</label><input id="pf-user" className="tr-in" value={f.username} onChange={e => setF({ ...f, username: e.target.value })} maxLength={24} pattern="[A-Za-z0-9_]{2,24}" title="2 to 24 letters, numbers or underscores" />
      <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>People can @mention you on cards with this name.</p>
      <label className="tr-lbl" htmlFor="pf-bio">Bio</label><textarea id="pf-bio" className="tr-in" value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} maxLength={1000} />
      <button className="tr-btn primary" style={{ marginTop: 12 }} disabled={busy}>Save</button>
    </form>
    <p className="muted" style={{ fontSize: 13, marginTop: 24 }}>Your name, username and photo are visible to people on boards and Workspaces you share. Your email is only shown to you.</p>
  </div>;
}
type Act = { id: string; at: string; text: string; boardId: string; boardTitle: string; cardId: string | null };
function MyActivity() {
  const app = useApp(); const [rows, setRows] = useState<Act[] | null>(null);
  useEffect(() => { app.call<{ activity: Act[] }>("GET", "/api/me/activity").then(r => setRows(r.activity)).catch(() => setRows([])); }, [app]);
  if (!rows) return <p className="muted">Loading…</p>; if (!rows.length) return <p className="muted">No activity yet.</p>;
  return <ul className="b-activity" data-testid="my-activity">{rows.map(a => <li key={a.boardId + a.id}><Avatar p={app.user} size="sm" /><div><b>{app.user.name}</b> {a.cardId ? <Link href={`/app/b/${a.boardId}?card=${a.cardId}`}>{fmtText(a.text)}</Link> : fmtText(a.text)} <span className="muted">on <Link href={`/app/b/${a.boardId}`}>{a.boardTitle}</Link></span><small className="muted" style={{ display: "block" }}>{ago(a.at)}</small></div></li>)}</ul>;
}
function MyCards() {
  const app = useApp(); const [rows, setRows] = useState<MyCard[] | null>(null);
  useEffect(() => { app.call<{ cards: MyCard[] }>("GET", "/api/me/cards").then(r => setRows(r.cards)).catch(() => setRows([])); }, [app]);
  if (!rows) return <p className="muted">Loading…</p>; if (!rows.length) return <div className="tr-empty">No cards assigned to you. Hover a card and press Space to join it.</div>;
  const boards = [...new Set(rows.map(r => r.boardId))];
  return <div data-testid="my-cards">{boards.map(id => { const rs = rows.filter(r => r.boardId === id); return <section key={id} className="tr-sec"><h2 className="tr-h3"><span className="tr-mi__thumb" style={{ background: bgCss(rs[0]!.bg, true), width: 24, height: 18 }} /><Link href={`/app/b/${id}`}>{rs[0]!.boardTitle}</Link></h2>
    <table className="tr-table"><thead><tr><th>Card</th><th>List</th><th>Due date</th></tr></thead><tbody>{rs.map(r => <tr key={r.cardId}><td><Link href={`/app/b/${id}?card=${r.cardId}`}>{r.title}</Link></td><td>{r.list}</td><td>{r.due ? <DueBadge due={r.due} complete={r.dueComplete} /> : <span className="muted">—</span>}</td></tr>)}</tbody></table></section>; })}</div>;
}
function SettingsTab() {
  const app = useApp(); const s = app.user.settings; const set = (p: Partial<typeof s>) => app.patchMe({ settings: p });
  return <div style={{ maxWidth: 560 }} data-testid="settings">
    <h2 className="tr-h3">Theme</h2><div style={{ display: "flex", gap: 8 }} role="radiogroup" aria-label="Theme">{([["light", "Light"], ["dark", "Dark"], ["system", "Match browser"]] as [Theme, string][]).map(([v, l]) => <button key={v} role="radio" aria-checked={s.theme === v} className={"tr-btn" + (s.theme === v ? " sel" : "")} onClick={() => set({ theme: v })}>{l}</button>)}</div>
    <h2 className="tr-h3" style={{ marginTop: 28 }}>Accessibility</h2>
    <label className="tr-check" style={{ marginBottom: 12 }}><input type="checkbox" checked={s.colorBlind} onChange={e => set({ colorBlind: e.target.checked })} />Enable color blind friendly mode<span className="muted" style={{ fontSize: 12 }}>(adds patterns to labels)</span></label>
    <label className="tr-check"><input type="checkbox" checked={s.shortcuts} onChange={e => set({ shortcuts: e.target.checked })} />Enable keyboard shortcuts<span className="muted" style={{ fontSize: 12 }}>(press ? to see them)</span></label>
    <h2 className="tr-h3" style={{ marginTop: 28 }}>Account</h2>
    {app.session.guest ? <p className="muted">You&apos;re using TrelloIsDead as a guest. <a href={`${BP}/signup?callbackUrl=${BP}/app/u/settings`}>Sign up</a> to keep your boards on every device. Everything you made as a guest comes with you.</p>
      : <p className="muted">Signed in as <b>{app.user.email}</b>. Password and sign-in methods are managed on the <a href={`${BP}/login`}>log-in page</a> (use “Can&apos;t log in?” to reset your password).</p>}
  </div>;
}
