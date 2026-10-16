"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SquareKanban, LayoutTemplate, Home, ChevronDown, Plus, Users, Settings } from "lucide-react";
import { useApp } from "@/components/app/AppProvider";
import { WsIcon } from "@/components/app/ui";
import { CreateWorkspaceDialog } from "@/components/app/Header";

/** Pages every workspace has, in sidebar order. */
export const WS_PAGES: { key: string; label: string; href: (id: string) => string; Icon: typeof Users }[] = [
  { key: "boards", label: "Boards", href: id => `/app/w/${id}`, Icon: SquareKanban },
  { key: "members", label: "Members", href: id => `/app/w/${id}/members`, Icon: Users },
  { key: "settings", label: "Settings", href: id => `/app/w/${id}/settings`, Icon: Settings },
];
export function Sidebar({ active }: { active?: string }) {
  const app = useApp(); const path = usePathname(); const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(app.workspaces.map(w => [w.id, path.includes(w.id)])));
  const [creating, setCreating] = useState(false);
  const on = (href: string) => (path === href || path === "/trelloisdead" + href ? " on" : "");
  return <aside className="tr-side tr-nav" aria-label="Boards navigation">
    <Link href="/app" className={active === "boards" ? "on" : ""}><SquareKanban size={16} />Boards</Link>
    <Link href="/app/templates" className={active === "templates" ? "on" : ""}><LayoutTemplate size={16} />Templates</Link>
    <Link href="/app/home" className={active === "home" ? "on" : ""}><Home size={16} />Home</Link>
    <h5>Workspaces <button aria-label="Create a Workspace" title="Create a Workspace" onClick={() => setCreating(true)}><Plus size={16} /></button></h5>
    {app.workspaces.map(w => <div key={w.id}>
      <button className="wsrow" aria-expanded={!!open[w.id]} onClick={() => setOpen(o => ({ ...o, [w.id]: !o[w.id] }))}><WsIcon ws={w} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</span><ChevronDown className="chev" size={16} /></button>
      {open[w.id] && <div className="sub">{WS_PAGES.map(p => <Link key={p.key} href={p.href(w.id)} className={on(p.href(w.id)).trim()}><p.Icon size={14} />{p.label}</Link>)}</div>}
    </div>)}
    {creating && <CreateWorkspaceDialog onClose={() => setCreating(false)} />}
  </aside>;
}
