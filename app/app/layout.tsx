import { redirect } from "next/navigation";
import { currentUser, entryRedirect } from "@/lib/session";
import { loadMe } from "@/lib/server/data";
import { AppProvider } from "@/components/app/AppProvider";
import { Header } from "@/components/app/Header";
import "@/components/app/app.css";
export const dynamic = "force-dynamic";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect(entryRedirect("/app"));
  const me = await loadMe(user);
  return <AppProvider initial={me} session={{ id: user.id, name: user.name, email: user.email, demo: user.demo, guest: user.guest }}><Header />{children}</AppProvider>;
}
