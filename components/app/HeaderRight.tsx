"use client";
import { BP } from "@/lib/basepath";
import { useApp } from "@/components/app/AppProvider";
import { Avatar } from "@/components/app/ui";
import { HeaderSearch } from "@/components/app/Search";
import { NotificationsBell } from "@/components/app/Notifications";
// Right side of the header: search, notifications, who is signed in and how to leave.
export function HeaderRight() {
  const app = useApp();
  return <div className="tr-hd__right">
    <HeaderSearch /><NotificationsBell />
    {app.session.guest ? <a className="tr-btn sm" href={`${BP}/login?callbackUrl=${BP}/app`}>Guest · Log in to keep your work</a> : <span className="muted" style={{ fontSize: 13 }}>{app.user.email || app.user.name}</span>}
    <Avatar p={app.user} />
    <form method="post" action={`${BP}/api/session/logout`} style={{ margin: 0 }}><button className="tr-btn sm subtle">Sign out</button></form>
  </div>;
}
