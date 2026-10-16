"use client";
// Notifications bell: assignments, mentions, comments on watched cards, moves, invites and due reminders.
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Bell, Clock, AtSign, UserPlus, MessageSquare, ArrowRight, Users } from "lucide-react";
import { ago, fmtText, type Notification } from "@/lib/model";
import { useApp } from "@/components/app/AppProvider";
import { PopHead, useDismiss } from "@/components/app/ui";

const ICON: Record<Notification["kind"], typeof Bell> = { assigned: UserPlus, mention: AtSign, comment: MessageSquare, due: Clock, invite: Users, added: Users, moved: ArrowRight };
export function NotificationsBell() {
  const app = useApp(); const router = useRouter(); const [open, setOpen] = useState(false); const [unreadOnly, setUnreadOnly] = useState(true); const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, () => setOpen(false), open);
  const all = app.user.notifications; const unread = all.filter(n => !n.read).length; const shown = unreadOnly ? all.filter(n => !n.read) : all;
  const go = (n: Notification) => { if (!n.read) void app.patchMe({ read: { id: n.id, on: true } }); setOpen(false); router.push(n.link); };
  return <div className="tr-dd" ref={ref} data-testid="notifications">
    <button className="tr-ib" aria-label={unread ? `Notifications (${unread} unread)` : "Notifications"} aria-expanded={open} onClick={() => { setOpen(o => !o); if (!open) void app.refresh(); }}><Bell size={18} />{unread > 0 && <span className="tr-badge" aria-hidden>{unread > 9 ? "9+" : unread}</span>}</button>
    {open && <div className="tr-pop right tr-notifs" role="dialog" aria-label="Notifications">
      <PopHead title="Notifications" onClose={() => setOpen(false)} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><label className="tr-check" style={{ fontSize: 13 }}><input type="checkbox" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)} />Only show unread</label><span style={{ flex: 1 }} />{unread > 0 && <button className="tr-btn sm subtle" onClick={() => app.patchMe({ readAll: true })}>Mark all as read</button>}</div>
      {!shown.length && <div style={{ textAlign: "center", padding: "24px 8px" }}><Bell size={36} style={{ color: "var(--subtlest)" }} /><p className="muted">{unreadOnly ? "No unread notifications." : "No notifications yet."} You&apos;ll hear about cards you&apos;re added to, @mentions, comments on cards you watch, and due-date reminders.</p></div>}
      {shown.map(n => { const I = ICON[n.kind] ?? Bell; return <div key={n.id} className={"tr-notif" + (n.read ? "" : " unread")}>
        <span className="tr-notif__ico"><I size={16} /></span>
        <button className="tr-notif__body" onClick={() => go(n)}><b>{n.byName}</b> {fmtText(n.text)}<small className="muted">{ago(n.at)}</small></button>
        <button className="tr-notif__dot" aria-label={n.read ? "Mark unread" : "Mark read"} title={n.read ? "Mark unread" : "Mark read"} onClick={() => app.patchMe({ read: { id: n.id, on: !n.read } })}><i /></button></div>; })}
    </div>}
  </div>;
}
