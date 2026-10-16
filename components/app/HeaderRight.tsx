"use client";
import { BP } from "@/lib/basepath";
import { useApp } from "@/components/app/AppProvider";
import { HeaderSearch } from "@/components/app/Search";
import { NotificationsBell } from "@/components/app/Notifications";
import { AccountMenu, ShortcutsDialog, openShortcuts } from "@/components/app/Account";
import { HelpCircle } from "lucide-react";
// Right side of the header: search, notifications, help/shortcuts and the account menu.
export function HeaderRight() {
  const app = useApp();
  return <div className="tr-hd__right">
    <HeaderSearch /><NotificationsBell />
    <button className="tr-ib" aria-label="Keyboard shortcuts and help" title="Keyboard shortcuts (?)" onClick={openShortcuts}><HelpCircle size={18} /></button>
    {app.session.guest && <a className="tr-btn sm primary tr-hide-sm" href={`${BP}/signup?callbackUrl=${BP}/app`}>Sign up to keep your work</a>}
    <AccountMenu /><ShortcutsDialog />
  </div>;
}
