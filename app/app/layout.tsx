import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { loadState } from "@/lib/boards-server";
import { AppHeader } from "@/components/AppHeader";
import { BoardsProvider, SaveBadge } from "@/components/BoardsProvider";
export const dynamic = "force-dynamic";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login?callbackUrl=" + encodeURIComponent("/app"));
  const initial = await loadState(user.id, user.demo);
  return <div className="app-root tr-root"><BoardsProvider initial={initial}><AppHeader user={user}><SaveBadge /></AppHeader>{children}</BoardsProvider></div>;
}
