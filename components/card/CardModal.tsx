"use client";
// The card back. Left: title, quick actions, members/labels/watch/dates/votes, custom fields, description,
// location, attachments and checklists. Right: comments and activity.
import { useEffect, useRef, useState } from "react";
import { X, Plus, Tag, Clock, CheckSquare, User, Paperclip, MoreHorizontal, Eye, AlignLeft, MapPin, Image as ImageIcon, ChevronDown, ThumbsUp, Link2, LayoutTemplate, Archive, Undo2, Trash2, Copy, ArrowRight, ListPlus, Download, Pencil, Zap, Play } from "lucide-react";
import { ago, dueStatus, findCard, fmtDate, labelColor, uid, type Attachment, type Card, type CustomField } from "@/lib/model";
import { useApp } from "@/components/app/AppProvider";
import { useBoard } from "@/components/app/BoardProvider";
import { Avatar, PopHead, copyText, useDismiss } from "@/components/app/ui";
import { Markdown, MdEditor } from "@/components/board/Markdown";
import { AttachPop, ChecklistPop, CoverPop, DatesPop, FieldsPop, LabelsPop, LocationPop, MembersPop, MovePop, cardLink, localDate } from "@/components/card/pops";
import { Checklists } from "@/components/card/Checklists";
import { Comments } from "@/components/card/Comments";
import { openAutomation } from "@/components/board/Automation";
import "./card.css";

/** Button + anchored popover. */
function Pop({ label, title, className = "c-btn", children, align, testid }: { label: React.ReactNode; title?: string; className?: string; align?: "right"; testid?: string; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null); useDismiss(ref, () => setOpen(false), open);
  return <div className="tr-dd" ref={ref}><button type="button" className={className} title={title} aria-label={title} aria-expanded={open} data-testid={testid} onClick={() => setOpen(o => !o)}>{label}</button>
    {open && <div className={"tr-pop c-pop" + (align === "right" ? " right" : "")}>{children(() => setOpen(false))}</div>}</div>;
}
export function CardModal({ cardId, onClose, onOpen }: { cardId: string; onClose: () => void; onOpen?: (id: string) => void }) {
  const app = useApp(); const { board, dispatch, editable, me, role } = useBoard(); const hit = findCard(board, cardId);
  const [title, setTitle] = useState(hit?.card.title ?? ""); const [editDesc, setEditDesc] = useState(false); const [drag, setDrag] = useState(false); const [confirmDel, setConfirmDel] = useState(false);
  useEffect(() => { if (hit) setTitle(hit.card.title); }, [hit?.card.title]); // eslint-disable-line react-hooks/exhaustive-deps
  // Escape closes the topmost thing only: an open popover (it closes itself) or an inline editor, then the card.
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key !== "Escape" || e.defaultPrevented) return; if (document.querySelector(".c-modal .tr-pop, .tr-scrim .tr-scrim")) return; onClose(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  useEffect(() => { if (hit) document.title = `${hit.card.title} on ${board.title} | TrelloIsDead`; return () => { document.title = `${board.title} | TrelloIsDead`; }; }, [hit?.card.title, board.title]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!hit) return <div className="tr-scrim" onMouseDown={onClose}><div className="tr-dialog" role="dialog" aria-label="Card not found"><h2>Card not found</h2><p>It may have been deleted, or moved to another board.</p><button className="tr-btn" onClick={onClose}>Close</button></div></div>;
  const { card, list } = hit; const watching = card.watchers.includes(me); const joined = card.members.includes(me);
  const labels = card.labels.map(id => board.labels.find(l => l.id === id)).filter(Boolean); const members = card.members.map(id => board.members.find(m => m.id === id)).filter(Boolean);
  const coverAtt = card.cover?.attachmentId ? card.attachments.find(a => a.id === card.cover!.attachmentId) : null; const due = dueStatus(card);
  const fields = board.powerUps.includes("fields") ? board.fields : []; const voting = board.powerUps.includes("voting");
  const upload = async (files: FileList) => { for (const f of Array.from(files)) { try { const fd = new FormData(); fd.append("file", f); fd.append("kind", "attachment"); fd.append("boardId", board.id); const r = await app.call<{ url: string; name: string; mime: string; size: number }>("POST", "/api/files", fd); dispatch({ t: "attachment.add", cardId, attachment: { id: uid("a"), name: r.name, url: r.url, kind: "file", mime: r.mime, size: r.size, by: "", at: "" } }); } catch (e) { app.toast(`${f.name}: ${(e as Error).message}`, { kind: "error" }); } } };
  const saveTitle = () => { if (title.trim() && title !== card.title) dispatch({ t: "card.patch", cardId, patch: { title } }); else setTitle(card.title); };
  return <div className="tr-scrim c-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className={"c-modal" + (drag ? " drop" : "")} role="dialog" aria-modal="true" aria-label={`Card: ${card.title}`} data-testid="card-modal"
      onDragOver={e => { if (editable && e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDrag(true); } }} onDragLeave={e => { if (e.currentTarget === e.target) setDrag(false); }} onDrop={e => { if (e.dataTransfer.files.length && editable) { e.preventDefault(); setDrag(false); void upload(e.dataTransfer.files); } }}>
      {(card.cover?.color || coverAtt) && <div className={"c-cover" + (coverAtt ? " img" : "")} style={coverAtt ? { backgroundImage: `url(${coverAtt.url})` } : undefined}>{card.cover?.color && <i className={"lc-" + card.cover.color} />}</div>}
      <div className="c-top">
        {editable ? <Pop className="c-listchip" label={<>{list.title}<ChevronDown size={14} /></>} title={`In list ${list.title}. Move card`}>{close => <MovePop card={card} mode="move" close={close} onMovedAway={onClose} />}</Pop> : <span className="c-listchip">{list.title}</span>}
        <span style={{ flex: 1 }} />
        {editable && <Pop className="tr-ib" label={<ImageIcon size={18} />} title="Cover" align="right">{close => <CoverPop card={card} close={close} />}</Pop>}
        <button className={"tr-ib" + (watching ? " on" : "")} aria-pressed={watching} aria-label={watching ? "Stop watching" : "Watch"} title={watching ? "You're watching this card. Click to stop watching." : "Watch this card to get notified about comments, moves and due dates."} onClick={() => dispatch({ t: "card.watch", cardId, on: !watching })}><Eye size={18} /></button>
        <Pop className="tr-ib" label={<MoreHorizontal size={18} />} title="Card actions" align="right" testid="card-actions">{close => <Actions card={card} close={close} onGone={onClose} />}</Pop>
        <button className="tr-ib" aria-label="Close" onClick={onClose}><X size={20} /></button>
      </div>
      {card.archived && <div className="c-banner"><Archive size={16} />This card is archived.{editable && <><button className="tr-btn sm" onClick={() => dispatch({ t: "card.patch", cardId, patch: { archived: false } })}><Undo2 size={14} />Send to board</button>
        {confirmDel ? <><button className="tr-btn sm danger" onClick={() => { dispatch({ t: "card.delete", cardId }, { undoable: false }); onClose(); }}>Delete forever</button><button className="tr-btn sm" onClick={() => setConfirmDel(false)}>Cancel</button></> : <button className="tr-btn sm danger" onClick={() => setConfirmDel(true)}><Trash2 size={14} />Delete</button>}</>}</div>}
      {card.isTemplate && <div className="c-banner tpl"><LayoutTemplate size={16} />This is a Template card.{editable && <button className="tr-btn sm primary" onClick={() => { const id = uid("c"); dispatch({ t: "card.copy", cardId, newId: id, listId: list.id, index: hit.index + 1, title: card.title, template: true, keep: { labels: true, members: true, checklists: true, attachments: true, comments: false, dates: true } }); app.toast("Card created from the template.", onOpen ? { action: { label: "Open", run: () => onOpen(id) } } : {}); }}>Create card from template</button>}</div>}
      <div className="c-cols">
        <div className="c-main">
          <div className="c-titlerow">
            {board.settings.completeOnFront || card.due ? <button className={"c-done" + (card.dueComplete ? " on" : "")} role="checkbox" aria-checked={card.dueComplete} aria-label={card.dueComplete ? "Mark incomplete" : "Mark complete"} disabled={!editable} onClick={() => dispatch({ t: "card.patch", cardId, patch: { dueComplete: !card.dueComplete } })}>{card.dueComplete ? "✓" : ""}</button> : null}
            <textarea className="c-title" aria-label="Card title" value={title} readOnly={!editable} rows={1} onChange={e => setTitle(e.target.value.replace(/\n/g, ""))} onBlur={saveTitle} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } if (e.key === "Escape") { e.stopPropagation(); setTitle(card.title); (e.target as HTMLTextAreaElement).blur(); } }} />
          </div>
          {editable && <div className="c-quick" role="toolbar" aria-label="Add to card">
            <Pop label={<><Plus size={16} />Add</>} title="Add to card" testid="add-menu">{close => <AddMenu card={card} close={close} />}</Pop>
            <Pop label={<><Tag size={16} />Labels</>} title="Labels">{close => <LabelsPop card={card} close={close} />}</Pop>
            <Pop label={<><Clock size={16} />Dates</>} title="Dates">{close => <DatesPop card={card} close={close} />}</Pop>
            <Pop label={<><CheckSquare size={16} />Checklist</>} title="Checklist">{close => <ChecklistPop card={card} close={close} />}</Pop>
            <Pop label={<><User size={16} />Members</>} title="Members">{close => <MembersPop card={card} close={close} />}</Pop>
            <Pop label={<><Paperclip size={16} />Attachment</>} title="Attachment">{close => <AttachPop card={card} close={close} />}</Pop>
          </div>}
          <div className="c-chips">
            {members.length > 0 && <div className="c-chip"><h4>Members</h4><div className="row">{members.map(m => <Avatar key={m!.id} p={m!} />)}{editable && <Pop className="c-round" label={<Plus size={16} />} title="Add members">{close => <MembersPop card={card} close={close} />}</Pop>}</div></div>}
            {labels.length > 0 && <div className="c-chip"><h4>Labels</h4><div className="row">{labels.map(l => <span key={l!.id} className={"b-label c-lbl lc-" + l!.color} title={labelColor(l!.color).name}>{l!.name}</span>)}{editable && <Pop className="c-round" label={<Plus size={16} />} title="Add labels">{close => <LabelsPop card={card} close={close} />}</Pop>}</div></div>}
            <div className="c-chip"><h4>Notifications</h4><button className={"c-btn" + (watching ? " sel" : "")} onClick={() => dispatch({ t: "card.watch", cardId, on: !watching })}><Eye size={16} />{watching ? "Watching" : "Watch"}{watching && " ✓"}</button></div>
            {(card.due || card.start) && <div className="c-chip"><h4>{card.start && card.due ? "Dates" : card.due ? "Due date" : "Start date"}</h4><div className="row">
              {card.due && <input type="checkbox" aria-label="Mark due date complete" checked={card.dueComplete} disabled={!editable} onChange={e => dispatch({ t: "card.patch", cardId, patch: { dueComplete: e.target.checked } })} />}
              {editable ? <Pop label={<>{card.start && fmtDate(card.start)}{card.start && card.due && " – "}{card.due && fmtDate(card.due, { time: true })}{card.due && due !== "later" && due !== "none" && <span className={"c-duetag " + due}>{due === "complete" ? "Complete" : due === "overdue" ? "Overdue" : "Due soon"}</span>}<ChevronDown size={14} /></>} title="Edit dates">{close => <DatesPop card={card} close={close} />}</Pop>
                : <span>{card.start && fmtDate(card.start)}{card.due && fmtDate(card.due, { time: true })}</span>}</div></div>}
            {voting && <div className="c-chip"><h4>Votes</h4><div className="row"><button className={"c-btn" + (card.votes.includes(me) ? " sel" : "")} disabled={!role || role === "observer"} onClick={() => dispatch({ t: "card.vote", cardId, on: !card.votes.includes(me) })}><ThumbsUp size={16} />{card.votes.includes(me) ? "Voted" : "Vote"} · {card.votes.length}</button>{card.votes.map(id => board.members.find(m => m.id === id)).filter(Boolean).map(m => <Avatar key={m!.id} p={m!} size="sm" />)}</div></div>}
          </div>
          {fields.length > 0 && <section className="c-sec" aria-label="Custom Fields"><div className="c-sechd"><ListPlus size={18} /><h3>Custom Fields</h3>{editable && <Pop className="tr-btn sm" label="Manage" title="Manage Custom Fields">{close => <FieldsPop close={close} />}</Pop>}</div>
            <div className="c-fields">{fields.map(f => <FieldInput key={f.id} f={f} card={card} />)}</div></section>}
          <section className="c-sec" aria-label="Description"><div className="c-sechd"><AlignLeft size={18} /><h3>Description</h3>{card.desc && editable && !editDesc && <button className="tr-btn sm" onClick={() => setEditDesc(true)}>Edit</button>}</div>
            <div className="c-indent">{editDesc ? <MdEditor initial={card.desc} label="Description" placeholder="Add a more detailed description…" onCancel={() => setEditDesc(false)} onSave={v => { if (v !== card.desc) dispatch({ t: "card.patch", cardId, patch: { desc: v } }); setEditDesc(false); }} />
              : card.desc ? <div onClick={e => { if (editable && !(e.target as HTMLElement).closest("a")) setEditDesc(true); }} className="c-desc"><Markdown text={card.desc} usernames={board.members.map(m => m.username)} /></div>
                : editable ? <button className="c-fake" onClick={() => setEditDesc(true)}>Add a more detailed description…</button> : <p className="muted">No description.</p>}</div></section>
          {card.location && <section className="c-sec" aria-label="Location"><div className="c-sechd"><MapPin size={18} /><h3>Location</h3>{editable && <Pop className="tr-btn sm" label="Change" title="Change location">{close => <LocationPop card={card} close={close} />}</Pop>}</div>
            <div className="c-indent"><b>{card.location.name}</b><p className="muted" style={{ margin: "2px 0 6px", fontSize: 13 }}>{card.location.address}</p><a href={`https://www.openstreetmap.org/?mlat=${card.location.lat}&mlon=${card.location.lng}#map=16/${card.location.lat}/${card.location.lng}`} target="_blank" rel="noopener noreferrer">Open in OpenStreetMap</a></div></section>}
          {card.attachments.length > 0 && <Attachments card={card} />}
          <Checklists card={card} />
          {editable && <section className="c-sec" aria-label="Automation"><div className="c-sechd"><Zap size={18} /><h3>Automation</h3></div>
            <div className="c-indent" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{board.buttons.filter(b => b.scope === "card").map(b => <button key={b.id} className="c-btn" onClick={() => dispatch({ t: "button.run", buttonId: b.id, cardId })}><Play size={14} />{b.name}</button>)}
              <button className="c-btn" onClick={() => openAutomation("card")}><Plus size={14} />Add button</button></div></section>}
        </div>
        <aside className="c-side"><Comments card={card} /></aside>
      </div>
      {drag && <div className="c-dropzone">Drop files to attach them</div>}
    </div></div>;
}
type AddView = "labels" | "dates" | "checklist" | "members" | "attach" | "location" | "fields";
function AddMenu({ card, close }: { card: Card; close: () => void }) {
  const [view, setView] = useState<AddView | null>(null);
  if (view === "labels") return <LabelsPop card={card} close={close} />; if (view === "dates") return <DatesPop card={card} close={close} />; if (view === "checklist") return <ChecklistPop card={card} close={close} />;
  if (view === "members") return <MembersPop card={card} close={close} />; if (view === "attach") return <AttachPop card={card} close={close} />; if (view === "location") return <LocationPop card={card} close={close} />; if (view === "fields") return <FieldsPop close={close} />;
  const it = (v: AddView, Icon: typeof Tag, l: string, d: string) => <button className="tr-mi" onClick={() => setView(v)}><Icon size={16} /><span>{l}<small>{d}</small></span></button>;
  return <><PopHead title="Add to card" onClose={close} />
    {it("labels", Tag, "Labels", "Organize, categorize, and prioritize")}{it("dates", Clock, "Dates", "Start dates, due dates, and reminders")}{it("checklist", CheckSquare, "Checklist", "Add subtasks")}
    {it("members", User, "Members", "Assign members")}{it("attach", Paperclip, "Attachment", "Add links, pages, work items, and more")}{it("location", MapPin, "Location", "View this card on a map")}{it("fields", ListPlus, "Custom Fields", "Create your own fields")}</>;
}
function Actions({ card, close, onGone }: { card: Card; close: () => void; onGone: () => void }) {
  const app = useApp(); const { board, dispatch, editable, me } = useBoard(); const [view, setView] = useState<null | "move" | "copy">(null); const joined = card.members.includes(me);
  if (view) return <MovePop card={card} mode={view} close={close} onMovedAway={onGone} />;
  return <><PopHead title="Actions" onClose={close} />
    {editable && <button className="tr-mi" onClick={() => { dispatch({ t: "card.member", cardId: card.id, userId: me, on: !joined }); close(); }}><User size={16} />{joined ? "Leave" : "Join"}</button>}
    {editable && <button className="tr-mi" onClick={() => setView("move")}><ArrowRight size={16} />Move</button>}
    {editable && <button className="tr-mi" onClick={() => setView("copy")}><Copy size={16} />Copy</button>}
    {editable && <button className="tr-mi" onClick={() => { dispatch({ t: "card.patch", cardId: card.id, patch: { isTemplate: !card.isTemplate } }); close(); }}><LayoutTemplate size={16} />{card.isTemplate ? "Turn into a regular card" : "Make template"}</button>}
    <button className="tr-mi" onClick={() => { dispatch({ t: "card.watch", cardId: card.id, on: !card.watchers.includes(me) }); close(); }}><Eye size={16} />{card.watchers.includes(me) ? "Stop watching" : "Watch"}</button>
    <button className="tr-mi" onClick={async () => { const ok = await copyText(cardLink(board.id, card.id)); app.toast(ok ? "Link to this card copied." : cardLink(board.id, card.id)); close(); }}><Link2 size={16} />Copy link</button>
    {editable && <><hr className="tr-sep" /><button className="tr-mi" onClick={() => { dispatch({ t: "card.patch", cardId: card.id, patch: { archived: !card.archived } }); close(); }}><Archive size={16} />{card.archived ? "Send to board" : "Archive"}</button></>}
  </>;
}
function FieldInput({ f, card }: { f: CustomField; card: Card }) {
  const { dispatch, editable } = useBoard(); const v = card.custom[f.id] ?? null; const set = (value: unknown) => dispatch({ t: "card.field", cardId: card.id, fieldId: f.id, value: value as never });
  return <label className="c-field"><span>{f.name}</span>
    {f.type === "checkbox" ? <input type="checkbox" checked={v === true} disabled={!editable} onChange={e => set(e.target.checked || null)} />
      : f.type === "list" ? <select className="tr-in" disabled={!editable} value={typeof v === "string" ? v : ""} onChange={e => set(e.target.value || null)}><option value="">Select…</option>{f.options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
      : f.type === "date" ? <input type="date" className="tr-in" disabled={!editable} value={typeof v === "string" ? localDate(v) : ""} onChange={e => set(e.target.value ? new Date(e.target.value + "T12:00:00").toISOString() : null)} />
      : <input className="tr-in" type={f.type === "number" ? "number" : "text"} disabled={!editable} defaultValue={v === null ? "" : String(v)} key={String(v)} placeholder={`Add ${f.name.toLowerCase()}…`} onBlur={e => { const x = e.target.value; if (x !== (v === null ? "" : String(v))) set(f.type === "number" ? (x === "" ? null : Number(x)) : x || null); }} />}
  </label>;
}
function Attachments({ card }: { card: Card }) {
  const { dispatch, editable } = useBoard(); const [edit, setEdit] = useState<string | null>(null); const [name, setName] = useState(""); const [del, setDel] = useState<string | null>(null);
  const isImg = (a: Attachment) => a.kind === "file" && a.mime.startsWith("image/");
  return <section className="c-sec" aria-label="Attachments"><div className="c-sechd"><Paperclip size={18} /><h3>Attachments</h3>{editable && <Pop className="tr-btn sm" label="Add" title="Add attachment" align="right">{close => <AttachPop card={card} close={close} />}</Pop>}</div>
    <ul className="c-atts">{card.attachments.map(a => <li key={a.id}>
      <a className="c-att__thumb" href={a.url} target="_blank" rel="noopener noreferrer" style={isImg(a) ? { backgroundImage: `url(${a.url})` } : undefined} aria-label={`Open ${a.name}`}>{!isImg(a) && (a.kind === "link" ? <Link2 size={20} /> : (a.name.split(".").pop() ?? "file").slice(0, 4).toUpperCase())}</a>
      <div className="grow">{edit === a.id ? <form onSubmit={e => { e.preventDefault(); dispatch({ t: "attachment.rename", cardId: card.id, attachmentId: a.id, name }); setEdit(null); }} style={{ display: "flex", gap: 6 }}><input className="tr-in" autoFocus aria-label="Attachment name" value={name} onChange={e => setName(e.target.value)} /><button className="tr-btn sm primary">Save</button><button type="button" className="tr-btn sm" onClick={() => setEdit(null)}>Cancel</button></form>
        : <><a href={a.url} target="_blank" rel="noopener noreferrer" className="c-att__name">{a.name}</a><small className="muted">Added {ago(a.at)}{a.size ? ` · ${(a.size / 1024).toFixed(a.size > 1e6 ? 0 : 1)} KB` : ""}{card.cover?.attachmentId === a.id ? " · Cover" : ""}</small></>}
        {edit !== a.id && editable && <div className="c-feed__acts">
          {isImg(a) && <button onClick={() => dispatch({ t: "card.patch", cardId: card.id, patch: { cover: card.cover?.attachmentId === a.id ? null : { color: null, attachmentId: a.id, size: card.cover?.size ?? "normal" } } })}>{card.cover?.attachmentId === a.id ? "Remove cover" : "Make cover"}</button>}
          {a.kind === "file" && <a href={a.url + "?download=1"}><Download size={12} /> Download</a>}
          <button onClick={() => { setEdit(a.id); setName(a.name); }}><Pencil size={12} /> Edit</button>
          {del === a.id ? <><span className="muted">Delete for good?</span><button className="danger" onClick={() => { dispatch({ t: "attachment.delete", cardId: card.id, attachmentId: a.id }, { undoable: false }); setDel(null); }}>Delete attachment</button><button onClick={() => setDel(null)}>Cancel</button></> : <button onClick={() => setDel(a.id)}>Delete</button>}
        </div>}</div></li>)}</ul></section>;
}
