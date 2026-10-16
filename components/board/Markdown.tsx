"use client";
// Markdown viewer + editor (descriptions and comments). The renderer escapes all HTML first (lib/markdown.ts).
import { useRef, useState } from "react";
import { Bold, Italic, Strikethrough, Code, Link as LinkIcon, List, ListOrdered, Heading, Quote } from "lucide-react";
import { renderMarkdown } from "@/lib/markdown";

export function Markdown({ text, usernames = [], className = "md" }: { text: string; usernames?: string[]; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: renderMarkdown(text, usernames) }} />;
}
type Tool = { label: string; Icon: typeof Bold; wrap?: [string, string]; line?: string };
const TOOLS: Tool[] = [
  { label: "Heading", Icon: Heading, line: "## " }, { label: "Bold", Icon: Bold, wrap: ["**", "**"] }, { label: "Italic", Icon: Italic, wrap: ["*", "*"] }, { label: "Strikethrough", Icon: Strikethrough, wrap: ["~~", "~~"] },
  { label: "Code", Icon: Code, wrap: ["`", "`"] }, { label: "Link", Icon: LinkIcon, wrap: ["[", "](https://)"] }, { label: "Bulleted list", Icon: List, line: "- " }, { label: "Numbered list", Icon: ListOrdered, line: "1. " }, { label: "Quote", Icon: Quote, line: "> " },
];
/** Textarea with a formatting toolbar. Ctrl/Cmd+Enter saves, Escape cancels. */
export function MdEditor({ initial, onSave, onCancel, label, placeholder, saveLabel = "Save", autoFocus = true, minRows = 6, children }: { initial: string; onSave: (v: string) => void; onCancel: () => void; label: string; placeholder?: string; saveLabel?: string; autoFocus?: boolean; minRows?: number; children?: React.ReactNode }) {
  const [v, setV] = useState(initial); const ta = useRef<HTMLTextAreaElement>(null);
  const apply = (t: Tool) => {
    const el = ta.current; if (!el) return; const s = el.selectionStart, e = el.selectionEnd; const sel = v.slice(s, e);
    let next: string, cs: number, ce: number;
    if (t.wrap) { const inner = sel || (t.label === "Link" ? "text" : t.label.toLowerCase()); next = v.slice(0, s) + t.wrap[0] + inner + t.wrap[1] + v.slice(e); cs = s + t.wrap[0].length; ce = cs + inner.length; }
    else { const ls = v.lastIndexOf("\n", s - 1) + 1; const block = v.slice(ls, e) || ""; const lines = block.split("\n").map((x, i) => (t.line === "1. " ? `${i + 1}. ` : t.line) + x); next = v.slice(0, ls) + lines.join("\n") + v.slice(e); cs = ls; ce = ls + lines.join("\n").length; }
    setV(next); requestAnimationFrame(() => { el.focus(); el.setSelectionRange(cs, ce); });
  };
  return <div className="md-ed">
    <div className="md-tools" role="toolbar" aria-label="Formatting">{TOOLS.map(t => <button key={t.label} type="button" title={t.label} aria-label={t.label} onMouseDown={e => e.preventDefault()} onClick={() => apply(t)}><t.Icon size={15} /></button>)}{children}</div>
    <textarea ref={ta} className="tr-in" aria-label={label} placeholder={placeholder} autoFocus={autoFocus} rows={minRows} value={v} onChange={e => setV(e.target.value)}
      onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSave(v); } if (e.key === "Escape") { e.stopPropagation(); onCancel(); } }} />
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}><button type="button" className="tr-btn primary" onClick={() => onSave(v)}>{saveLabel}</button><button type="button" className="tr-btn subtle" onClick={onCancel}>Cancel</button><span className="muted" style={{ fontSize: 12, alignSelf: "center", marginLeft: "auto" }}>Markdown supported</span></div>
  </div>;
}
