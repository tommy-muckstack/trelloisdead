"use client";
import { BP } from "@/lib/basepath";
import { useApp } from "@/components/app/AppProvider";
import { Avatar } from "@/components/app/ui";
// Right side of the header: who is signed in and how to leave. (Search, notifications and the account menu come later.)
export function HeaderRight() {
  const app = useApp();
  return <div className="tr-hd__right">
    {app.session.guest ? <a className="tr-btn sm" href={`${BP}/login?callbackUrl=${BP}/app`}>Guest · Log in to keep your work</a> : <span className="muted" style={{ fontSize: 13 }}>{app.user.email || app.user.name}</span>}
    <Avatar p={app.user} />
    <form method="post" action={`${BP}/api/session/logout`} style={{ margin: 0 }}><button className="tr-btn sm subtle">Sign out</button></form>
  </div>;
}
