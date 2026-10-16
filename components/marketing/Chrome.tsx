"use client";
// Marketing chrome shared by the landing, pricing, help and legal pages: top nav with working dropdowns
// (Features, Solutions, Plans, Resources), a mobile menu, and the footer. Every link goes to a real page.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, X, Menu } from "lucide-react";
import { Mark } from "@/components/Mark";

import { GH } from "@/lib/links";
export { GH };
type Item = { href: string; t: string; d: string; ext?: boolean };
export const MENUS: { id: string; label: string; items: Item[] }[] = [
  { id: "features", label: "Features", items: [
    { href: "/features#boards", t: "Boards", d: "Lists and cards you drag from idea to done." }, { href: "/features#views", t: "Views", d: "Table, Calendar, Timeline, Dashboard and Map." },
    { href: "/features#automation", t: "Automation", d: "Rules and buttons that do the busywork." }, { href: "/features#power-ups", t: "Power-Ups", d: "Voting, list limits, custom fields and more." },
    { href: "/templates", t: "Templates", d: "Twelve ready-made boards to start from." }, { href: "/features#collaboration", t: "Collaboration", d: "Workspaces, sharing, mentions and notifications." } ] },
  { id: "solutions", label: "Solutions", items: [
    { href: "/solutions#marketing", t: "Marketing teams", d: "Content calendars and campaign boards." }, { href: "/solutions#product", t: "Product management", d: "Roadmaps that show direction, not promises." },
    { href: "/solutions#engineering", t: "Engineering teams", d: "Sprints, bug triage and code review." }, { href: "/solutions#design", t: "Design teams", d: "Briefs, feedback rounds and handoff." },
    { href: "/solutions#remote", t: "Remote teams", d: "Async standups and decision logs." }, { href: "/solutions#education", t: "Students and teachers", d: "Semester planners and group projects." } ] },
  { id: "plans", label: "Plans", items: [
    { href: "/pricing#ours", t: "TrelloIsDead: $0", d: "Every feature for everyone. No seat fees, ever." }, { href: "/pricing#plans", t: "Compare with Trello's plans", d: "Trello's published prices, side by side." },
    { href: "/pricing#compare", t: "Feature comparison", d: "What each Trello plan includes." }, { href: "/help#self-host", t: "Self-host it", d: "Run your own copy. Apache-2.0." } ] },
  { id: "resources", label: "Resources", items: [
    { href: "/help", t: "Help center", d: "Getting started, boards, cards and more." }, { href: "/help#shortcuts", t: "Keyboard shortcuts", d: "Every shortcut in one list." },
    { href: "/templates", t: "Template gallery", d: "Browse templates by category." }, { href: "/about", t: "About TrelloIsDead", d: "Why it exists and who it's for." },
    { href: GH, t: "Source code on GitHub", d: "Read it, fork it, contribute.", ext: true } ] },
];
const A = ({ i, onClick }: { i: Item; onClick?: () => void }) => i.ext ? <a href={i.href} target="_blank" rel="noopener noreferrer" className="mm-item" onClick={onClick}><b>{i.t} ↗</b><span>{i.d}</span></a> : <Link href={i.href} className="mm-item" onClick={onClick}><b>{i.t}</b><span>{i.d}</span></Link>;
export function TrLogo({ light }: { light?: boolean }) { return <span className="tr-logo2" style={{ color: light ? "#fff" : "#172b4d" }}><Mark size={28} />TrelloIsDead</span>; }
export function TrNav() {
  const [open, setOpen] = useState<string | null>(null); const [mobile, setMobile] = useState(false); const ref = useRef<HTMLElement>(null);
  useEffect(() => { const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null); }; const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(null); setMobile(false); } }; document.addEventListener("mousedown", down); document.addEventListener("keydown", key); return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); }; }, []);
  const cur = MENUS.find(m => m.id === open);
  return <header className="tr-nav" ref={ref}>
    <Link href="/" className="lg" aria-label="TrelloIsDead home"><TrLogo /></Link>
    <nav aria-label="Main">{MENUS.map(m => <button key={m.id} type="button" aria-expanded={open === m.id} aria-controls="mm-panel" onClick={() => setOpen(o => (o === m.id ? null : m.id))} className={open === m.id ? "on" : ""}>{m.label} <ChevronDown size={14} /></button>)}<Link href="/pricing">Pricing</Link></nav>
    <span className="sp" /><Link href="/login" className="li">Log in</Link><Link href="/signup" className="cta">Get TrelloIsDead for free</Link>
    <button type="button" className="hb" aria-label={mobile ? "Close menu" : "Open menu"} aria-expanded={mobile} onClick={() => setMobile(m => !m)}>{mobile ? <X size={26} /> : <Menu size={26} />}</button>
    {cur && <div className="mm" id="mm-panel" role="region" aria-label={cur.label}><div className="mm-in"><div className="mm-side"><h3>{cur.label}</h3><p>{cur.id === "features" ? "Everything a board needs, free for everyone." : cur.id === "solutions" ? "Start from a template made for the way your team works." : cur.id === "plans" ? "One plan: free. Here's how that compares." : "Learn the app, or look under the hood."}</p></div>
      <div className="mm-grid">{cur.items.map(i => <A key={i.href + i.t} i={i} onClick={() => setOpen(null)} />)}</div></div></div>}
    {mobile && <div className="mnav" role="dialog" aria-label="Menu">{MENUS.map(m => <details key={m.id}><summary>{m.label}</summary>{m.items.map(i => <A key={i.href + i.t} i={i} onClick={() => setMobile(false)} />)}</details>)}
      <Link href="/pricing" className="mnav-a" onClick={() => setMobile(false)}>Pricing</Link><div className="mnav-cta"><Link href="/login" className="li2">Log in</Link><Link href="/signup" className="cta2">Get TrelloIsDead for free</Link></div></div>}
  </header>;
}
export function TrFoot() {
  return <footer className="tr-foot2">
    <div className="row"><div className="lg"><TrLogo light /><Link href="/login" className="lo">Log in</Link></div>
      {[["/about", "About TrelloIsDead", "Why it exists and how it's built."], ["/help", "Help", "Guides for boards, cards, views and automation."], ["/templates", "Templates", "Ready-made boards for every kind of team."], [GH, "Source code", "Apache-2.0 on GitHub. Issues and pull requests welcome."]].map(([h, t, d]) =>
        h!.startsWith("http") ? <a key={t} href={h} target="_blank" rel="noopener noreferrer"><b>{t}</b><span>{d}</span></a> : <Link key={t} href={h!}><b>{t}</b><span>{d}</span></Link>)}</div>
    <div className="bar"><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms</Link><a href={GH + "/issues"} target="_blank" rel="noopener noreferrer">Contact us</a><span className="disc">TrelloIsDead is an independent open-source project. It is not affiliated with, endorsed by or sponsored by Atlassian or Trello. Trello is a trademark of its owner.</span></div>
  </footer>;
}
