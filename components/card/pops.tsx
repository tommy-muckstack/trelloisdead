"use client";
// Card popovers: members, labels, dates, checklist, attachment, cover, location, custom fields, move, copy.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Search, MapPin, Trash2, Plus } from "lucide-react";
import { LABEL_COLORS, REMINDERS, uid, type Board, type Card, type CustomField, type FieldType, type Place } from "@/lib/model";
import { BP } from "@/lib/basepath";
import { useApp } from "@/components/app/AppProvider";
import { useBoard } from "@/components/app/BoardProvider";
import { Avatar, PopHead } from "@/components/app/ui";
import { Labels } from "@/components/board/BoardMenu";

export const pad = (n: number) => String(n).padStart(2, "0");
export const localDate = (iso: string) => { const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const localTime = (iso: string) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

export function MembersPop({ card, close }: { card: Card; close: () => void }) {
  const { board, dispatch, editable } = useBoard(); const [q, setQ] = useState("");
  const shown = board.members.filter(m => !q.trim() || (m.name + " " + m.username).toLowerCase().includes(q.trim().toLowerCase()));
  return <div data-testid="members-pop"><PopHead title="Members" onClose={close} />
    <input className="tr-in" autoFocus aria-label="Search members" placeholder="Search members" value={q} onChange={e => setQ(e.target.value)} />
    <h6 style={{ marginTop: 12 }}>Board members</h6>
    {shown.map(m => { const on = card.members.includes(m.id); return <button key={m.id} className="tr-mi" role="menuitemcheckbox" aria-checked={on} disabled={!editable} onClick={() => dispatch({ t: "card.member", cardId: card.id, userId: m.id, on: !on })}><Avatar p={m} size="sm" /><span>{m.name}<small>@{m.username}</small></span>{on && <Check size={16} className="end" />}</button>; })}
    {!shown.length && <p className="muted">No members match.</p>}
  </div>;
}
export function LabelsPop({ card, close }: { card: Card; close: () => void }) {
  const { dispatch } = useBoard();
  return <div data-testid="labels-pop"><PopHead title="Labels" onClose={close} /><Labels selected={card.labels} onPick={id => dispatch({ t: "card.label", cardId: card.id, labelId: id, on: !card.labels.includes(id) })} /></div>;
}
export function DatesPop({ card, close }: { card: Card; close: () => void }) {
  const { dispatch } = useBoard();
  const [hasStart, setHasStart] = useState(!!card.start); const [start, setStart] = useState(card.start ?? localDate(new Date().toISOString()));
  const def = new Date(Date.now() + 864e5); def.setHours(12, 0, 0, 0);
  const [hasDue, setHasDue] = useState(!!card.due || !card.start); const [due, setDue] = useState(localDate(card.due ?? def.toISOString())); const [time, setTime] = useState(card.due ? localTime(card.due) : "12:00");
  const [rem, setRem] = useState(card.reminder < 0 && !card.due ? 1440 : card.reminder);
  const save = () => {
    const dueIso = hasDue && due ? new Date(`${due}T${time || "12:00"}:00`).toISOString() : null;
    dispatch({ t: "card.patch", cardId: card.id, patch: { start: hasStart && start ? start : null, due: dueIso, reminder: dueIso ? rem : -1, ...(dueIso && dueIso !== card.due ? { dueComplete: false } : {}) } }); close(); };
  return <div data-testid="dates-pop"><PopHead title="Dates" onClose={close} />
    <label className="tr-lbl" style={{ marginTop: 0 }}>Start date</label>
    <div className="c-daterow"><input type="checkbox" aria-label="Enable start date" checked={hasStart} onChange={e => setHasStart(e.target.checked)} /><input type="date" className="tr-in" aria-label="Start date" disabled={!hasStart} value={start} onChange={e => setStart(e.target.value)} /></div>
    <label className="tr-lbl">Due date</label>
    <div className="c-daterow"><input type="checkbox" aria-label="Enable due date" checked={hasDue} onChange={e => setHasDue(e.target.checked)} /><input type="date" className="tr-in" aria-label="Due date" disabled={!hasDue} value={due} onChange={e => setDue(e.target.value)} /><input type="time" className="tr-in" aria-label="Due time" disabled={!hasDue} value={time} onChange={e => setTime(e.target.value)} style={{ width: 120 }} /></div>
    <label className="tr-lbl" htmlFor="rem">Set due date reminder</label>
    <select id="rem" className="tr-in" disabled={!hasDue} value={rem} onChange={e => setRem(Number(e.target.value))}>{REMINDERS.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}</select>
    <p className="muted" style={{ fontSize: 12, margin: "6px 0 12px" }}>Reminders are sent to all members and watchers of this card.</p>
    <button className="tr-btn primary full" onClick={save}>Save</button>
    <button className="tr-btn full" style={{ marginTop: 8 }} onClick={() => { dispatch({ t: "card.patch", cardId: card.id, patch: { start: null, due: null, reminder: -1, dueComplete: false } }); close(); }}>Remove</button>
  </div>;
}
export function ChecklistPop({ card, close }: { card: Card; close: () => void }) {
  const { board, dispatch } = useBoard(); const [title, setTitle] = useState("Checklist"); const [from, setFrom] = useState("");
  const others = board.lists.flatMap(l => l.cards.filter(c => !c.archived).flatMap(c => c.checklists.map(cl => ({ cl, c }))));
  return <form data-testid="checklist-pop" onSubmit={e => { e.preventDefault(); const src = others.find(x => x.cl.id === from); dispatch({ t: "checklist.add", cardId: card.id, checklistId: uid("k"), title: title.trim() || src?.cl.title || "Checklist", copyFrom: from || null }); close(); }}>
    <PopHead title="Add checklist" onClose={close} />
    <label className="tr-lbl" htmlFor="ck-t" style={{ marginTop: 0 }}>Title</label><input id="ck-t" className="tr-in" autoFocus value={title} onChange={e => setTitle(e.target.value)} onFocus={e => e.target.select()} maxLength={512} />
    {others.length > 0 && <><label className="tr-lbl" htmlFor="ck-from">Copy items from…</label><select id="ck-from" className="tr-in" value={from} onChange={e => setFrom(e.target.value)}><option value="">(none)</option>{others.map(({ cl, c }) => <option key={cl.id} value={cl.id}>{c.title}: {cl.title}</option>)}</select></>}
    <button className="tr-btn primary" style={{ marginTop: 12 }}>Add</button></form>;
}
export function AttachPop({ card, close }: { card: Card; close: () => void }) {
  const app = useApp(); const { board, dispatch } = useBoard(); const file = useRef<HTMLInputElement>(null); const [url, setUrl] = useState(""); const [name, setName] = useState(""); const [busy, setBusy] = useState(false);
  const upload = async (files: FileList) => {
    setBusy(true);
    for (const f of Array.from(files)) {
      try { const fd = new FormData(); fd.append("file", f); fd.append("kind", "attachment"); fd.append("boardId", board.id); const r = await app.call<{ id: string; url: string; name: string; mime: string; size: number }>("POST", "/api/files", fd);
        dispatch({ t: "attachment.add", cardId: card.id, attachment: { id: uid("a"), name: r.name, url: r.url, kind: "file", mime: r.mime, size: r.size, by: "", at: "" } }); }
      catch (e) { app.toast(`${f.name}: ${(e as Error).message}`, { kind: "error" }); }
    }
    setBusy(false); close();
  };
  const link = (e: React.FormEvent) => { e.preventDefault(); let u = url.trim(); if (!u) return; if (!/^https?:\/\//i.test(u)) u = "https://" + u; try { new URL(u); } catch { app.toast("That link doesn't look right.", { kind: "error" }); return; }
    dispatch({ t: "attachment.add", cardId: card.id, attachment: { id: uid("a"), name: name.trim() || u, url: u, kind: "link", mime: "", size: 0, by: "", at: "" } }); close(); };
  return <div data-testid="attach-pop"><PopHead title="Attach" onClose={close} />
    <h6>Attach a file from your computer</h6><p className="muted" style={{ fontSize: 12, margin: "0 0 6px" }}>You can also drag and drop files onto the card to upload them. Up to 4 MB each.</p>
    <button className="tr-btn full" disabled={busy} onClick={() => file.current?.click()}>{busy ? "Uploading…" : "Choose a file"}</button>
    <input ref={file} type="file" multiple hidden aria-label="Choose a file" onChange={e => { if (e.target.files?.length) void upload(e.target.files); e.target.value = ""; }} />
    <hr className="tr-sep" />
    <form onSubmit={link}><label className="tr-lbl" htmlFor="at-url" style={{ marginTop: 0 }}>Search or paste a link <span className="tr-req">*</span></label><input id="at-url" className="tr-in" placeholder="Paste any link here…" value={url} onChange={e => setUrl(e.target.value)} />
      <label className="tr-lbl" htmlFor="at-name">Display text (optional)</label><input id="at-name" className="tr-in" placeholder="Text to display" value={name} onChange={e => setName(e.target.value)} />
      <button className="tr-btn primary" style={{ marginTop: 12 }} disabled={!url.trim()}>Insert</button></form>
  </div>;
}
export function CoverPop({ card, close }: { card: Card; close: () => void }) {
  const { dispatch, board } = useBoard(); const cur = card.cover; const imgs = card.attachments.filter(a => a.kind === "file" && a.mime.startsWith("image/"));
  const set = (p: Card["cover"]) => dispatch({ t: "card.patch", cardId: card.id, patch: { cover: p } });
  const COVER_COLORS = ["green", "yellow", "orange", "red", "purple", "blue", "sky", "lime", "pink", "black"];
  return <div data-testid="cover-pop"><PopHead title="Cover" onClose={close} />
    {!board.settings.covers && <p className="tr-invite" style={{ fontSize: 12 }}>Card covers are turned off for this board (Menu → Settings), so covers only show on the card back.</p>}
    <h6>Size</h6><div style={{ display: "flex", gap: 8 }}>{(["normal", "full"] as const).map(s => <button key={s} className={"c-coversize" + (cur?.size === s ? " on" : "")} disabled={!cur} aria-label={s === "normal" ? "Cover above the title" : "Full-card cover"} aria-pressed={cur?.size === s} onClick={() => cur && set({ ...cur, size: s })}><i className={s} /></button>)}</div>
    {cur && <button className="tr-btn full" style={{ marginTop: 8 }} onClick={() => set(null)}>Remove cover</button>}
    <h6>Colors</h6><div className="b-colors">{COVER_COLORS.map(c => <button key={c} aria-label={`${c} cover`} className={"lc-" + c + (cur?.color === c ? " on" : "")} onClick={() => set({ color: c, attachmentId: null, size: cur?.size ?? "normal" })} />)}</div>
    {imgs.length > 0 && <><h6>Attachments</h6><div className="tr-bgs" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>{imgs.map(a => <button key={a.id} aria-label={`Use ${a.name} as cover`} className={cur?.attachmentId === a.id ? "on" : ""} style={{ background: `center/cover url(${a.url}?b=${board.id})`, height: 48 }} onClick={() => set({ color: null, attachmentId: a.id, size: cur?.size ?? "normal" })} />)}</div></>}
  </div>;
}
export function LocationPop({ card, close }: { card: Card; close: () => void }) {
  const app = useApp(); const { dispatch } = useBoard(); const [q, setQ] = useState(card.location?.address ?? ""); const [res, setRes] = useState<Place[] | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const search = async (e: React.FormEvent) => { e.preventDefault(); if (q.trim().length < 3) return; setBusy(true); setErr(""); try { const r = await app.call<{ places: Place[]; error?: string }>("GET", `/api/geo?q=${encodeURIComponent(q)}`); setRes(r.places); if (r.error) setErr(r.error); } catch (e2) { setErr((e2 as Error).message); } finally { setBusy(false); } };
  return <div data-testid="location-pop"><PopHead title="Location" onClose={close} />
    <form onSubmit={search} style={{ display: "flex", gap: 6 }}><input className="tr-in" autoFocus aria-label="Search for a location" placeholder="Search for a place or address" value={q} onChange={e => setQ(e.target.value)} /><button className="tr-btn" style={{ height: 36 }} disabled={busy} aria-label="Search"><Search size={16} /></button></form>
    {busy && <p className="muted">Searching…</p>}{err && <p className="muted">{err}</p>}
    {res && !res.length && !busy && <p className="muted">No places found.</p>}
    {res?.map((p, i) => <button key={i} className="tr-mi" onClick={() => { dispatch({ t: "card.patch", cardId: card.id, patch: { location: p } }); close(); }}><MapPin size={16} /><span>{p.name}<small>{p.address}</small></span></button>)}
    <p className="tr-credit" style={{ marginTop: 8 }}>Place search by OpenStreetMap Nominatim. © OpenStreetMap contributors.</p>
    {card.location && <button className="tr-btn full" onClick={() => { dispatch({ t: "card.patch", cardId: card.id, patch: { location: null } }); close(); }}>Remove location</button>}
  </div>;
}
const FIELD_TYPES: [FieldType, string][] = [["text", "Text"], ["number", "Number"], ["date", "Date"], ["checkbox", "Checkbox"], ["list", "Dropdown"]];
export function FieldsPop({ close }: { close: () => void }) {
  const { board, dispatch } = useBoard(); const [edit, setEdit] = useState<CustomField | null>(null); const [opt, setOpt] = useState(""); const [confirm, setConfirm] = useState(false);
  if (!board.powerUps.includes("fields")) return <div><PopHead title="Custom Fields" onClose={close} /><p>Custom Fields let you add structured data to cards: numbers, dates, dropdowns and more.</p><button className="tr-btn primary full" onClick={() => dispatch({ t: "powerup.toggle", powerUp: "fields", on: true })}>Add the Custom Fields Power-Up</button></div>;
  if (edit) { const exists = board.fields.some(f => f.id === edit.id);
    return <div data-testid="field-editor"><PopHead title={exists ? "Edit field" : "New field"} onClose={close} onBack={() => setEdit(null)} />
      <label className="tr-lbl" htmlFor="cf-n" style={{ marginTop: 0 }}>Title</label><input id="cf-n" className="tr-in" autoFocus value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} maxLength={100} />
      <label className="tr-lbl" htmlFor="cf-t">Type</label><select id="cf-t" className="tr-in" value={edit.type} disabled={exists} onChange={e => setEdit({ ...edit, type: e.target.value as FieldType, options: [] })}>{FIELD_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      {edit.type === "list" && <><label className="tr-lbl">Options</label>{edit.options.map(o => <div key={o.id} style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}><span className={"b-label lc-" + o.color} style={{ flex: 1, height: 28 }}>{o.name}</span><select className="tr-in" aria-label={`Color for ${o.name}`} value={o.color} onChange={e => setEdit({ ...edit, options: edit.options.map(x => (x.id === o.id ? { ...x, color: e.target.value } : x)) })} style={{ width: 110, height: 28 }}>{LABEL_COLORS.filter(c => !c.id.includes("_")).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="tr-ib" aria-label={`Remove ${o.name}`} onClick={() => setEdit({ ...edit, options: edit.options.filter(x => x.id !== o.id) })}><Trash2 size={14} /></button></div>)}
        <form onSubmit={e => { e.preventDefault(); if (opt.trim()) { setEdit({ ...edit, options: [...edit.options, { id: uid("o"), name: opt.trim(), color: "black_light" }] }); setOpt(""); } }} style={{ display: "flex", gap: 6 }}><input className="tr-in" aria-label="Add an option" placeholder="Add an option…" value={opt} onChange={e => setOpt(e.target.value)} /><button className="tr-btn" style={{ height: 36 }} aria-label="Add option"><Plus size={16} /></button></form></>}
      <label className="tr-check" style={{ marginTop: 12 }}><input type="checkbox" checked={edit.front} onChange={e => setEdit({ ...edit, front: e.target.checked })} />Show field on front of card</label>
      <button className="tr-btn primary full" style={{ marginTop: 12 }} disabled={!edit.name.trim() || (edit.type === "list" && !edit.options.length)} onClick={() => { dispatch({ t: "field.save", field: edit }); setEdit(null); }}>{exists ? "Save" : "Create"}</button>
      {exists && (confirm ? <button className="tr-btn danger full" style={{ marginTop: 8 }} onClick={() => { dispatch({ t: "field.delete", fieldId: edit.id }, { undoable: false }); setEdit(null); setConfirm(false); }}>Delete field and its values on every card</button> : <button className="tr-btn full" style={{ marginTop: 8 }} onClick={() => setConfirm(true)}>Delete field</button>)}
    </div>; }
  return <div data-testid="fields-pop"><PopHead title="Custom Fields" onClose={close} />
    {board.fields.map(f => <button key={f.id} className="tr-mi" onClick={() => setEdit(f)}><span>{f.name}<small>{FIELD_TYPES.find(t => t[0] === f.type)![1]}{f.front ? " · shown on front" : ""}</small></span></button>)}
    {!board.fields.length && <p className="muted">No fields yet.</p>}
    <button className="tr-btn full" style={{ marginTop: 8 }} onClick={() => setEdit({ id: uid("f"), name: "", type: "text", options: [], front: true })}>+ New field</button>
  </div>;
}

/** Move / copy a card: board, list, position (another board goes through the server's transfer endpoint). */
export function MovePop({ card, mode, close, onMovedAway }: { card: Card; mode: "move" | "copy"; close: () => void; onMovedAway?: () => void }) {
  const app = useApp(); const { board, dispatch } = useBoard(); const router = useRouter();
  const targets = app.boards.filter(b => !b.closed && (b.role === "admin" || b.role === "normal"));
  const cur = board.lists.find(l => l.cards.some(c => c.id === card.id))!;
  const [to, setTo] = useState(board.id); const [dest, setDest] = useState<Board>(board); const [list, setList] = useState(cur.id); const [pos, setPos] = useState(0);
  const [title, setTitle] = useState(card.title); const [keep, setKeep] = useState({ labels: true, members: true, checklists: true, attachments: true, comments: false, dates: true });
  useEffect(() => { if (to === board.id) { setDest(board); return; } app.call<{ board: Board }>("GET", `/api/b/${to}`).then(r => { setDest(r.board); const l = r.board.lists.find(x => !x.archived); setList(l?.id ?? ""); }).catch(() => {}); }, [to]); // eslint-disable-line react-hooks/exhaustive-deps
  const lst = dest.lists.find(l => l.id === list); const visible = lst ? lst.cards.filter(c => !c.archived && (mode === "copy" || c.id !== card.id)) : [];
  useEffect(() => { if (list === cur.id && to === board.id) setPos(mode === "move" ? Math.max(0, cur.cards.filter(c => !c.archived).findIndex(c => c.id === card.id)) : visible.length); else setPos(visible.length); }, [list, to]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = async () => {
    const anchor = visible[pos]; const full = lst ? lst.cards.filter(c => mode === "copy" || c.id !== card.id) : []; const index = anchor ? full.findIndex(c => c.id === anchor.id) : full.length;
    if (to === board.id) { if (mode === "move") dispatch({ t: "card.move", cardId: card.id, listId: list, index }); else dispatch({ t: "card.copy", cardId: card.id, newId: uid("c"), listId: list, index, title, keep }); close(); return; }
    try { const r = await app.call<{ boardId: string; cardId: string }>("POST", "/api/transfer", { kind: "card", copy: mode === "copy", fromBoard: board.id, itemId: card.id, toBoard: to, toList: list, index: pos });
      close(); if (mode === "move") onMovedAway?.(); app.toast(`${mode === "move" ? "Moved" : "Copied"} to ${dest.title}.`, { action: { label: "Open", run: () => router.push(`/app/b/${r.boardId}?card=${r.cardId}`) } }); }
    catch (e) { app.toast((e as Error).message, { kind: "error" }); }
  };
  return <div data-testid={mode + "-pop"}><PopHead title={mode === "move" ? "Move card" : "Copy card"} onClose={close} />
    {mode === "copy" && <><label className="tr-lbl" htmlFor="cp-title" style={{ marginTop: 0 }}>Name</label><textarea id="cp-title" className="tr-in" value={title} onChange={e => setTitle(e.target.value)} style={{ minHeight: 56 }} />
      <h6>Keep…</h6>{([["checklists", "Checklists"], ["labels", "Labels"], ["members", "Members"], ["attachments", "Attachments"], ["dates", "Dates"]] as const).map(([k, l]) => <label key={k} className="tr-check" style={{ margin: "4px 0" }}><input type="checkbox" checked={keep[k]} onChange={e => setKeep({ ...keep, [k]: e.target.checked })} />{l}</label>)}</>}
    <h6>Select destination</h6>
    <label className="tr-lbl" htmlFor="mv-board" style={{ marginTop: 0 }}>Board</label><select id="mv-board" className="tr-in" value={to} onChange={e => setTo(e.target.value)}>{targets.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select>
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
      <div><label className="tr-lbl" htmlFor="mv-list">List</label><select id="mv-list" className="tr-in" value={list} onChange={e => setList(e.target.value)}>{dest.lists.filter(l => !l.archived).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select></div>
      <div><label className="tr-lbl" htmlFor="mv-pos">Position</label><select id="mv-pos" className="tr-in" value={pos} onChange={e => setPos(Number(e.target.value))}>{Array.from({ length: visible.length + 1 }, (_, i) => <option key={i} value={i}>{i + 1}</option>)}</select></div>
    </div>
    <button className="tr-btn primary" style={{ marginTop: 12 }} onClick={go} disabled={!list}>{mode === "move" ? "Move" : "Create card"}</button>
    {to !== board.id && mode === "move" && <p className="muted" style={{ fontSize: 12 }}>Labels move when the other board has a label with the same name and colour. Members who aren&apos;t on that board are dropped.</p>}
  </div>;
}
export const cardLink = (boardId: string, cardId: string) => `${typeof window !== "undefined" ? window.location.origin : ""}${BP}/app/b/${boardId}?card=${cardId}`;
