"use client";
// Comments and activity on the card back: composer with @mention autocomplete, Markdown comments with
// edit/delete, and the card's activity (Show details / Hide details).
import { useMemo, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { ago, fmtText, uid, type Card } from "@/lib/model";
import { useBoard } from "@/components/app/BoardProvider";
import { Avatar } from "@/components/app/ui";
import { Markdown } from "@/components/board/Markdown";

type Opt = { username: string; name: string; hint: string };
/** Textarea that suggests board members after "@". */
export function MentionArea({ value, onChange, onSubmit, onCancel, label, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; onSubmit: () => void; onCancel?: () => void; label: string; placeholder?: string; autoFocus?: boolean }) {
  const { board } = useBoard(); const ta = useRef<HTMLTextAreaElement>(null); const [q, setQ] = useState<string | null>(null); const [sel, setSel] = useState(0);
  const opts: Opt[] = useMemo(() => { if (q === null) return []; const all: Opt[] = [...board.members.map(m => ({ username: m.username, name: m.name, hint: "@" + m.username })), { username: "card", name: "Card members", hint: "Notify everyone on this card" }, { username: "board", name: "Board members", hint: "Notify everyone on this board" }];
    return all.filter(o => (o.username + " " + o.name).toLowerCase().includes(q.toLowerCase())).slice(0, 8); }, [q, board.members]);
  const detect = (v: string, caret: number) => { const m = v.slice(0, caret).match(/(?:^|\s)@([a-z0-9_]*)$/i); setQ(m ? m[1]! : null); setSel(0); };
  const insert = (o: Opt) => { const el = ta.current!; const caret = el.selectionStart; const before = value.slice(0, caret).replace(/@([a-z0-9_]*)$/i, `@${o.username} `); const next = before + value.slice(caret); onChange(next); setQ(null); requestAnimationFrame(() => { el.focus(); el.setSelectionRange(before.length, before.length); }); };
  return <div className="c-mention">
    <textarea ref={ta} className="tr-in" aria-label={label} placeholder={placeholder} autoFocus={autoFocus} value={value} rows={3}
      onChange={e => { onChange(e.target.value); detect(e.target.value, e.target.selectionStart); }} onClick={e => detect(value, (e.target as HTMLTextAreaElement).selectionStart)}
      onKeyDown={e => {
        if (q !== null && opts.length) { if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => (s + 1) % opts.length); return; } if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => (s - 1 + opts.length) % opts.length); return; } if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insert(opts[sel]!); return; } if (e.key === "Escape") { e.stopPropagation(); setQ(null); return; } }
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSubmit(); }
        if (e.key === "Escape" && onCancel) { e.stopPropagation(); onCancel(); }
      }} />
    {q !== null && opts.length > 0 && <div className="c-mention__list" role="listbox" aria-label="Mention someone">{opts.map((o, i) => <button key={o.username} type="button" role="option" aria-selected={i === sel} className={"tr-mi" + (i === sel ? " on" : "")} onMouseDown={e => { e.preventDefault(); insert(o); }}><b>{o.name}</b><small style={{ marginLeft: 6 }}>{o.hint}</small></button>)}</div>}
  </div>;
}
export function Comments({ card }: { card: Card }) {
  const { board, dispatch, role, me } = useBoard(); const [details, setDetails] = useState(true); const [text, setText] = useState(""); const [open, setOpen] = useState(false); const [editing, setEditing] = useState<string | null>(null); const [editText, setEditText] = useState(""); const [del, setDel] = useState<string | null>(null);
  const canComment = board.settings.comments !== "disabled" && !!role && (role !== "observer" || board.settings.comments !== "members");
  const usernames = board.members.map(m => m.username).concat(["card", "board"]);
  const send = () => { if (!text.trim()) return; dispatch({ t: "comment.add", cardId: card.id, commentId: uid("m"), text }); setText(""); setOpen(false); };
  type Row = { kind: "comment"; at: string; c: Card["comments"][number] } | { kind: "act"; at: string; a: (typeof board.activity)[number] };
  const rows: Row[] = [...card.comments.map(c => ({ kind: "comment" as const, at: c.at, c })), ...(details ? board.activity.filter(a => a.cardId === card.id).map(a => ({ kind: "act" as const, at: a.at, a })) : [])].sort((x, y) => y.at.localeCompare(x.at));
  const me0 = board.members.find(m => m.id === me);
  return <section className="c-comments" aria-label="Comments and activity">
    <div className="c-sechd"><MessageSquare size={18} /><h3>Comments and activity</h3><button className="tr-btn sm" onClick={() => setDetails(d => !d)}>{details ? "Hide details" : "Show details"}</button></div>
    {canComment ? <div className="c-compose">{me0 && <Avatar p={me0} size="sm" />}<div style={{ flex: 1 }}>
      {open || text ? <><MentionArea value={text} onChange={setText} onSubmit={send} onCancel={() => { if (!text) setOpen(false); }} label="Write a comment" placeholder="Write a comment… Type @ to mention someone." autoFocus />
        <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}><button className="tr-btn primary sm" disabled={!text.trim()} onClick={send}>Save</button><span className="muted" style={{ fontSize: 12 }}>Markdown supported · Ctrl/⌘+Enter to save</span></div></>
        : <button className="c-fake" onClick={() => setOpen(true)}>Write a comment…</button>}
    </div></div> : <p className="muted" style={{ fontSize: 13 }}>{board.settings.comments === "disabled" ? "Comments are turned off on this board." : "Only board members can comment on this board."}</p>}
    <ul className="c-feed">{rows.map(r => r.kind === "comment" ? <li key={r.c.id} className="c-feed__c">
      <Avatar p={board.members.find(m => m.id === r.c.by) ?? { id: r.c.by, name: r.c.byName, initials: r.c.byName.slice(0, 1).toUpperCase(), color: "" }} size="sm" />
      <div className="grow"><div><b>{r.c.byName}</b> <small className="muted">{ago(r.c.at)}{r.c.edited ? " (edited)" : ""}</small></div>
        {editing === r.c.id ? <><MentionArea value={editText} onChange={setEditText} onSubmit={() => { dispatch({ t: "comment.edit", cardId: card.id, commentId: r.c.id, text: editText }); setEditing(null); }} onCancel={() => setEditing(null)} label="Edit comment" autoFocus />
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}><button className="tr-btn primary sm" onClick={() => { dispatch({ t: "comment.edit", cardId: card.id, commentId: r.c.id, text: editText }); setEditing(null); }}>Save</button><button className="tr-btn sm subtle" onClick={() => setEditing(null)}>Discard changes</button></div></>
          : <div className="c-bubble"><Markdown text={r.c.text} usernames={usernames} /></div>}
        {editing !== r.c.id && (r.c.by === me || role === "admin") && <div className="c-feed__acts">{r.c.by === me && <button onClick={() => { setEditing(r.c.id); setEditText(r.c.text); }}>Edit</button>}{del === r.c.id ? <><span className="muted">Delete forever? There is no undo.</span><button className="danger" onClick={() => { dispatch({ t: "comment.delete", cardId: card.id, commentId: r.c.id }, { undoable: false }); setDel(null); }}>Delete comment</button><button onClick={() => setDel(null)}>Cancel</button></> : <button onClick={() => setDel(r.c.id)}>Delete</button>}</div>}
      </div></li>
      : <li key={r.a.id} className="c-feed__a"><Avatar p={board.members.find(m => m.id === r.a.by) ?? { id: r.a.by, name: r.a.byName, initials: r.a.byName.slice(0, 1).toUpperCase(), color: "" }} size="sm" /><div className="grow"><b>{r.a.byName}</b> {fmtText(r.a.ctext || r.a.text)}<small className="muted" style={{ display: "block" }}>{ago(r.a.at)}</small></div></li>)}</ul>
  </section>;
}
