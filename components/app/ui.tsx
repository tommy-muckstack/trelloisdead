"use client";
// Small shared pieces for the app: dismissable popovers, avatars, workspace icons, board tiles.
import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Star, ChevronLeft, X } from "lucide-react";
import { bgCss, colorFor, type BoardSummary, type Person, type Workspace } from "@/lib/model";
import { useApp } from "@/components/app/AppProvider";

/** Close on outside mousedown or Escape. Escape is marked handled (defaultPrevented) so the layer below ignores it. */
export function useDismiss(ref: RefObject<HTMLElement | null>, onClose: () => void, active = true) {
  const cb = useRef(onClose); cb.current = onClose;
  useEffect(() => {
    if (!active) return;
    const down = (e: MouseEvent) => { const el = ref.current; if (el && !el.contains(e.target as Node)) cb.current(); };
    // Escape closes only this layer: mark it handled (preventDefault, not stopPropagation) so dialogs underneath stay open.
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); cb.current(); } };
    const t = setTimeout(() => { document.addEventListener("mousedown", down); document.addEventListener("keydown", key); }, 0);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [ref, active]);
}
/** A button that toggles an anchored popover. */
export function Dropdown({ label, children, className, right, wide, title, testid }: { label: React.ReactNode; children: (close: () => void) => React.ReactNode; className?: string; right?: boolean; wide?: boolean; title?: string; testid?: string }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null); useDismiss(ref, () => setOpen(false), open);
  return <div className="tr-dd" ref={ref}><button type="button" className={className} aria-expanded={open} aria-haspopup="menu" title={title} data-testid={testid} onClick={() => setOpen(o => !o)}>{label}</button>
    {open && <div className={"tr-pop" + (right ? " right" : "") + (wide ? " wide" : "")} role="menu">{children(() => setOpen(false))}</div>}</div>;
}
export function PopHead({ title, onClose, onBack }: { title: string; onClose: () => void; onBack?: () => void }) {
  return <div className="tr-pop__hd">{onBack ? <button aria-label="Back" onClick={onBack}><ChevronLeft size={16} /></button> : <span />}<span>{title}</span><button aria-label="Close" onClick={onClose}><X size={16} /></button></div>;
}
export function Avatar({ p, size = "", title }: { p: Pick<Person, "id" | "name" | "initials" | "color"> & { avatar?: string | null }; size?: "" | "sm" | "lg" | "xl"; title?: string }) {
  return <span className={"tr-av " + size} title={title ?? p.name} aria-label={p.name} style={p.avatar ? { background: `center/cover url(${p.avatar})` } : { background: p.color || colorFor(p.id) }}>{p.avatar ? "" : p.initials}</span>;
}
export function WsIcon({ ws, lg }: { ws: Pick<Workspace, "id" | "name">; lg?: boolean }) {
  return <span className={"tr-ws-ico" + (lg ? " lg" : "")} style={{ background: `linear-gradient(${colorFor(ws.id)},${colorFor(ws.id + "x")})` }} aria-hidden>{(ws.name.trim()[0] ?? "W").toUpperCase()}</span>;
}
export function BoardTile({ b, showWs }: { b: BoardSummary; showWs?: string }) {
  const { starred, toggleStar } = useApp(); const on = starred(b.id);
  return <div className="tr-tile" style={{ background: bgCss(b.bg, true) }} data-board-id={b.id}>
    <Link href={`/app/b/${b.id}`} aria-label={`Open ${b.title}`}>{b.title}{showWs && <small style={{ display: "block", fontWeight: 400, fontSize: 12, opacity: .9 }}>{showWs}</small>}</Link>
    {b.isTemplate && <span className="tr-tile__tag">Template</span>}
    <button className={"tr-tile__star" + (on ? " on" : "")} aria-label={on ? `Unstar ${b.title}` : `Star ${b.title}`} aria-pressed={on} onClick={() => toggleStar(b.id)}><Star size={16} fill={on ? "currentColor" : "none"} /></button>
  </div>;
}
/** Copy to the clipboard; resolves false (instead of hanging) when the browser blocks or stalls clipboard access. */
export const copyText = async (text: string) => { try { return await Promise.race([navigator.clipboard.writeText(text).then(() => true), new Promise<boolean>(r => setTimeout(() => r(false), 1500))]); } catch { return false; } };
export const absUrl = (path: string) => (typeof window !== "undefined" ? window.location.origin : "") + path;
