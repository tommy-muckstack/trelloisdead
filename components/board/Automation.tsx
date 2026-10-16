"use client";
// Power-Ups directory and Automation (rules, card buttons, board buttons), Butler-style but built in.
import { useEffect, useState } from "react";
import { Rocket, Zap, ThumbsUp, Hourglass, ListOrdered, ListPlus, Hash, Plus, Trash2, Pencil, Play } from "lucide-react";
import { POWERUPS, uid, labelColor, type ButtonDef, type Rule, type RuleStep, type TriggerKind } from "@/lib/model";
import { describeStep, describeTrigger } from "@/lib/actions";
import { useBoard } from "@/components/app/BoardProvider";

const PU_ICON: Record<string, typeof Rocket> = { voting: ThumbsUp, aging: Hourglass, limits: ListOrdered, fields: ListPlus, numbers: Hash };
export function PowerUpsDialog({ onClose }: { onClose: () => void }) {
  const { board, dispatch, editable } = useBoard(); const [q, setQ] = useState(""); const [cat, setCat] = useState("All");
  useEsc(onClose);
  const cats = ["All", ...new Set(POWERUPS.map(p => p.cat))]; const shown = POWERUPS.filter(p => (cat === "All" || p.cat === cat) && (!q.trim() || (p.name + " " + p.desc).toLowerCase().includes(q.trim().toLowerCase())));
  const on = POWERUPS.filter(p => board.powerUps.includes(p.id));
  return <div className="tr-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="tr-dialog wide" role="dialog" aria-modal="true" aria-labelledby="pu-h" data-testid="powerups" style={{ maxWidth: 880 }}>
    <button className="tr-x" aria-label="Close" onClick={onClose}>×</button><h2 id="pu-h"><Rocket size={20} style={{ verticalAlign: -3 }} /> Power-Ups</h2>
    <p className="muted">Add features to this board. Every Power-Up here is built into TrelloIsDead, free, and works for everyone on the board.</p>
    {on.length > 0 && <><h3 className="tr-h3" style={{ fontSize: 14 }}>Enabled on this board ({on.length})</h3><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>{on.map(p => { const I = PU_ICON[p.id] ?? Rocket; return <span key={p.id} className="tr-pill" style={{ height: 28, fontSize: 13 }}><I size={14} />{p.name}</span>; })}</div></>}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}><input className="tr-in" aria-label="Search Power-Ups" placeholder="Search Power-Ups" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 280 }} />
      <div className="tr-cats" style={{ margin: 0 }}>{cats.map(c => <button key={c} className={cat === c ? "on" : ""} onClick={() => setCat(c)}>{c}</button>)}</div></div>
    <div className="pu-grid">{shown.map(p => { const I = PU_ICON[p.id] ?? Rocket; const enabled = board.powerUps.includes(p.id);
      return <div key={p.id} className="pu-card" data-powerup={p.id}><div className="pu-ico"><I size={22} /></div><div style={{ flex: 1 }}><b>{p.name}</b><small className="muted" style={{ display: "block" }}>By {p.by} · {p.cat}</small><p>{p.desc}</p></div>
        {editable && <button className={"tr-btn " + (enabled ? "" : "primary")} onClick={() => dispatch({ t: "powerup.toggle", powerUp: p.id, on: !enabled })}>{enabled ? "Disable" : "Add"}</button>}</div>; })}
      {!shown.length && <p className="muted">No Power-Ups match “{q}”.</p>}</div>
  </div></div>;
}
function useEsc(f: () => void) { useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) f(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [f]); }

const CARD_STEPS: { t: RuleStep["t"]; label: string }[] = [{ t: "move", label: "Move the card" }, { t: "label", label: "Add or remove a label" }, { t: "complete", label: "Mark complete / incomplete" }, { t: "due", label: "Set or remove the due date" }, { t: "join", label: "Add me to the card" }, { t: "clearMembers", label: "Remove all members" }, { t: "checklist", label: "Add a checklist" }, { t: "archive", label: "Archive the card" }];
const BOARD_STEPS: { t: RuleStep["t"]; label: string }[] = [{ t: "sortList", label: "Sort a list" }, { t: "archiveList", label: "Archive all cards in a list" }, { t: "moveAll", label: "Move all cards from one list to another" }];
const TRIGGERS: { k: TriggerKind; label: string }[] = [{ k: "card.added", label: "When a card is added to a list" }, { k: "card.moved", label: "When a card is moved into a list" }, { k: "card.complete", label: "When a card is marked complete" }, { k: "checklist.done", label: "When all checklist items are completed" }, { k: "label.added", label: "When a label is added to a card" }];
function StepEditor({ s, set, del }: { s: RuleStep; set: (s: RuleStep) => void; del: () => void }) {
  const { board } = useBoard(); const lists = board.lists.filter(l => !l.archived);
  const ListSel = ({ v, on, label }: { v: string; on: (x: string) => void; label: string }) => <select className="tr-in au-sel" aria-label={label} value={v} onChange={e => on(e.target.value)}>{lists.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select>;
  return <div className="au-step">
    {s.t === "move" && <>Move the card to the <select className="tr-in au-sel" aria-label="Position" value={s.pos} onChange={e => set({ ...s, pos: e.target.value as "top" | "bottom" })}><option value="top">top</option><option value="bottom">bottom</option></select> of list <ListSel label="Move to list" v={s.listId} on={x => set({ ...s, listId: x })} /></>}
    {s.t === "label" && <><select className="tr-in au-sel" aria-label="Add or remove" value={s.on ? "add" : "remove"} onChange={e => set({ ...s, on: e.target.value === "add" })}><option value="add">Add</option><option value="remove">Remove</option></select> the label <select className="tr-in au-sel" aria-label="Label" value={s.labelId} onChange={e => set({ ...s, labelId: e.target.value })}>{board.labels.map(l => <option key={l.id} value={l.id}>{l.name || labelColor(l.color).name}</option>)}</select></>}
    {s.t === "complete" && <>Mark the card <select className="tr-in au-sel" aria-label="Complete or incomplete" value={s.on ? "y" : "n"} onChange={e => set({ ...s, on: e.target.value === "y" })}><option value="y">complete</option><option value="n">incomplete</option></select></>}
    {s.t === "due" && <>{s.days === null ? "Remove the due date" : <>Set the due date to <input type="number" className="tr-in au-sel" aria-label="Days from now" min={0} max={365} value={s.days} onChange={e => set({ ...s, days: Math.max(0, Number(e.target.value) || 0) })} style={{ width: 70 }} /> days from now</>} <button className="tr-btn sm" onClick={() => set({ ...s, days: s.days === null ? 1 : null })}>{s.days === null ? "Set a date instead" : "Remove instead"}</button></>}
    {s.t === "archive" && "Archive the card"}{s.t === "join" && "Add the person who triggered it to the card"}{s.t === "clearMembers" && "Remove all members from the card"}
    {s.t === "checklist" && <>Add a checklist named <input className="tr-in au-sel" aria-label="Checklist name" value={s.title} onChange={e => set({ ...s, title: e.target.value })} style={{ width: 180 }} /></>}
    {s.t === "sortList" && <>Sort list <ListSel label="List to sort" v={s.listId} on={x => set({ ...s, listId: x })} /> by <select className="tr-in au-sel" aria-label="Sort by" value={s.by} onChange={e => set({ ...s, by: e.target.value as typeof s.by })}><option value="due">due date</option><option value="title">name</option><option value="newest">newest</option><option value="oldest">oldest</option><option value="votes">votes</option></select></>}
    {s.t === "archiveList" && <>Archive all cards in list <ListSel label="List to archive" v={s.listId} on={x => set({ ...s, listId: x })} /></>}
    {s.t === "moveAll" && <>Move all cards in <ListSel label="From list" v={s.from} on={x => set({ ...s, from: x })} /> to <ListSel label="To list" v={s.to} on={x => set({ ...s, to: x })} /></>}
    <button className="tr-ib" aria-label="Remove this action" onClick={del} style={{ marginLeft: "auto", borderRadius: 4 }}><Trash2 size={14} /></button>
  </div>;
}
function newStep(t: RuleStep["t"], board: ReturnType<typeof useBoard>["board"]): RuleStep {
  const l = board.lists.find(x => !x.archived)?.id ?? ""; const l2 = board.lists.filter(x => !x.archived)[1]?.id ?? l;
  switch (t) { case "move": return { t, listId: l2, pos: "top" }; case "label": return { t, labelId: board.labels[0]?.id ?? "", on: true }; case "complete": return { t, on: true }; case "due": return { t, days: 1 };
    case "checklist": return { t, title: "Checklist" }; case "sortList": return { t, listId: l, by: "due" }; case "archiveList": return { t, listId: l }; case "moveAll": return { t, from: l, to: l2 }; default: return { t } as RuleStep; }
}
function StepsBuilder({ steps, setSteps, kinds }: { steps: RuleStep[]; setSteps: (s: RuleStep[]) => void; kinds: typeof CARD_STEPS }) {
  const { board } = useBoard();
  return <><div className="au-steps">{steps.map((s, i) => <StepEditor key={i} s={s} set={n => setSteps(steps.map((x, j) => (j === i ? n : x)))} del={() => setSteps(steps.filter((_, j) => j !== i))} />)}</div>
    <select className="tr-in" aria-label="Add an action" value="" onChange={e => { if (e.target.value) setSteps([...steps, newStep(e.target.value as RuleStep["t"], board)]); }} style={{ maxWidth: 320 }}><option value="">+ Add an action…</option>{kinds.map(k => <option key={k.t} value={k.t}>{k.label}</option>)}</select></>;
}
function RuleForm({ rule, onDone }: { rule: Rule; onDone: () => void }) {
  const { board, dispatch } = useBoard(); const [r, setR] = useState(rule); const lists = board.lists.filter(l => !l.archived);
  return <div className="au-form" data-testid="rule-form"><h3 className="tr-h3" style={{ fontSize: 15 }}>{board.rules.some(x => x.id === rule.id) ? "Edit rule" : "Create a rule"}</h3>
    <label className="tr-lbl" htmlFor="au-trig">Trigger</label>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><select id="au-trig" className="tr-in" style={{ maxWidth: 360 }} value={r.trigger.kind} onChange={e => setR({ ...r, trigger: { kind: e.target.value as TriggerKind, listId: null, labelId: null } })}>{TRIGGERS.map(t => <option key={t.k} value={t.k}>{t.label}</option>)}</select>
      {(r.trigger.kind === "card.added" || r.trigger.kind === "card.moved") && <select className="tr-in" aria-label="Trigger list" style={{ maxWidth: 220 }} value={r.trigger.listId ?? ""} onChange={e => setR({ ...r, trigger: { ...r.trigger, listId: e.target.value || null } })}><option value="">any list</option>{lists.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select>}
      {r.trigger.kind === "label.added" && <select className="tr-in" aria-label="Trigger label" style={{ maxWidth: 220 }} value={r.trigger.labelId ?? ""} onChange={e => setR({ ...r, trigger: { ...r.trigger, labelId: e.target.value || null } })}><option value="">any label</option>{board.labels.map(l => <option key={l.id} value={l.id}>{l.name || labelColor(l.color).name}</option>)}</select>}</div>
    <label className="tr-lbl">Actions</label><StepsBuilder steps={r.steps} setSteps={steps => setR({ ...r, steps })} kinds={CARD_STEPS} />
    <label className="tr-lbl" htmlFor="au-name">Name <span className="muted" style={{ fontWeight: 400 }}>Optional</span></label><input id="au-name" className="tr-in" value={r.name} onChange={e => setR({ ...r, name: e.target.value })} placeholder={describeTrigger(board, r.trigger)} style={{ maxWidth: 420 }} />
    <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button className="tr-btn primary" disabled={!r.steps.length} onClick={() => { dispatch({ t: "rule.save", rule: r }); onDone(); }}>Save rule</button><button className="tr-btn subtle" onClick={onDone}>Cancel</button></div>
  </div>;
}
function ButtonForm({ btn, onDone }: { btn: ButtonDef; onDone: () => void }) {
  const { board, dispatch } = useBoard(); const [b, setB] = useState(btn);
  return <div className="au-form" data-testid="button-form"><h3 className="tr-h3" style={{ fontSize: 15 }}>{board.buttons.some(x => x.id === btn.id) ? "Edit button" : `Create a ${b.scope} button`}</h3>
    <label className="tr-lbl" htmlFor="au-bname">Button name</label><input id="au-bname" className="tr-in" value={b.name} onChange={e => setB({ ...b, name: e.target.value })} style={{ maxWidth: 320 }} />
    <label className="tr-lbl">Actions</label><StepsBuilder steps={b.steps} setSteps={steps => setB({ ...b, steps })} kinds={b.scope === "card" ? CARD_STEPS : BOARD_STEPS} />
    <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button className="tr-btn primary" disabled={!b.steps.length || !b.name.trim()} onClick={() => { dispatch({ t: "button.save", button: b }); onDone(); }}>Save button</button><button className="tr-btn subtle" onClick={onDone}>Cancel</button></div>
  </div>;
}
export function AutomationDialog({ tab0 = "rules", onClose }: { tab0?: "rules" | "card" | "board"; onClose: () => void }) {
  const { board, dispatch, editable } = useBoard(); const [tab, setTab] = useState(tab0); const [rule, setRule] = useState<Rule | null>(null); const [btn, setBtn] = useState<ButtonDef | null>(null);
  useEsc(onClose);
  const buttons = board.buttons.filter(b => b.scope === (tab === "card" ? "card" : "board"));
  return <div className="tr-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="tr-dialog wide" role="dialog" aria-modal="true" aria-labelledby="au-h" data-testid="automation" style={{ maxWidth: 880 }}>
    <button className="tr-x" aria-label="Close" onClick={onClose}>×</button><h2 id="au-h"><Zap size={20} style={{ verticalAlign: -3 }} /> Automation</h2>
    <p className="muted">Automate repetitive work on this board. Rules run when something happens; buttons run when you click them. Everything runs for free, with no monthly command limit.</p>
    <div className="tr-tabs" role="tablist">{([["rules", "Rules"], ["card", "Card buttons"], ["board", "Board buttons"]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => { setTab(k); setRule(null); setBtn(null); }}>{l}</button>)}</div>
    {!editable && <p className="tr-invite">Only board members can change automation.</p>}
    {tab === "rules" && (rule ? <RuleForm rule={rule} onDone={() => setRule(null)} /> : <>
      {editable && <button className="tr-btn primary" onClick={() => setRule({ id: uid("r"), name: "", enabled: true, trigger: { kind: "card.moved", listId: board.lists.filter(l => !l.archived).at(-1)?.id ?? null, labelId: null }, steps: [{ t: "complete", on: true }] })}><Plus size={16} />Create rule</button>}
      <ul className="au-list" data-testid="rules">{board.rules.map(r => <li key={r.id}><label className="tr-check" title={r.enabled ? "Rule is on" : "Rule is off"}><input type="checkbox" aria-label={`Enable rule ${r.name || describeTrigger(board, r.trigger)}`} checked={r.enabled} disabled={!editable} onChange={e => dispatch({ t: "rule.save", rule: { ...r, enabled: e.target.checked } })} /></label>
        <div style={{ flex: 1 }}>{r.name && <b style={{ display: "block" }}>{r.name}</b>}<span className={r.enabled ? "" : "muted"}><b>{describeTrigger(board, r.trigger)}</b>, {r.steps.map(s => describeStep(board, s)).join(", ")}</span></div>
        {editable && <><button className="tr-ib" aria-label="Edit rule" onClick={() => setRule(r)}><Pencil size={14} /></button><button className="tr-ib" aria-label="Delete rule" onClick={() => dispatch({ t: "rule.delete", ruleId: r.id }, { undoable: false })}><Trash2 size={14} /></button></>}</li>)}
        {!board.rules.length && <li className="muted">No rules yet. Example: when a card is moved into “Done”, mark it complete and remove its members.</li>}</ul></>)}
    {tab !== "rules" && (btn ? <ButtonForm btn={btn} onDone={() => setBtn(null)} /> : <>
      {editable && <button className="tr-btn primary" onClick={() => setBtn({ id: uid("u"), name: "", scope: tab === "card" ? "card" : "board", steps: tab === "card" ? [{ t: "join" }] : [newStep("sortList", board)] })}><Plus size={16} />Create {tab === "card" ? "card" : "board"} button</button>}
      <p className="muted" style={{ fontSize: 13 }}>{tab === "card" ? "Card buttons appear on the back of every card on this board, under Automation." : "Board buttons appear in the board header."}</p>
      <ul className="au-list">{buttons.map(b => <li key={b.id}><Play size={14} /><div style={{ flex: 1 }}><b>{b.name}</b><span className="muted" style={{ display: "block", fontSize: 13 }}>{b.steps.map(s => describeStep(board, s)).join(", ")}</span></div>
        {editable && <><button className="tr-ib" aria-label={`Edit ${b.name}`} onClick={() => setBtn(b)}><Pencil size={14} /></button><button className="tr-ib" aria-label={`Delete ${b.name}`} onClick={() => dispatch({ t: "button.delete", buttonId: b.id }, { undoable: false })}><Trash2 size={14} /></button></>}</li>)}
        {!buttons.length && <li className="muted">No {tab} buttons yet.</li>}</ul></>)}
  </div></div>;
}
/** Open the automation dialog from anywhere on the board (e.g. the card back). */
export const openAutomation = (tab: "rules" | "card" | "board") => window.dispatchEvent(new CustomEvent("trelloisdead:automation", { detail: tab }));
