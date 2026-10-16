import Link from "next/link";
import { currentUser } from "@/lib/session";
import { tokenInfo } from "@/lib/server/data";
import { bgCss } from "@/lib/model";
import { BP } from "@/lib/basepath";
import { JoinButton } from "@/components/app/JoinButton";
export const dynamic = "force-dynamic";
export const metadata = { title: "Join | TrelloIsDead" };
export default async function Join({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const [u, t] = await Promise.all([currentUser(), tokenInfo(token)]);
  return <main className="tr-main" style={{ margin: "40px auto", maxWidth: 520, textAlign: "center" }} data-testid="join">
    {!t ? <><h1 style={{ fontSize: 22 }}>This invite link isn&apos;t active</h1><p className="muted">Ask whoever sent it for a new link.</p><Link className="tr-btn" href="/app">Go to your boards</Link></> : <>
      {t.kind === "board" && <div style={{ height: 120, borderRadius: 8, background: bgCss(t.bg, true), marginBottom: 20 }} />}
      <h1 style={{ fontSize: 22 }}>You&apos;re invited to join the {t.kind === "board" ? "board" : "Workspace"} {t.name}</h1>
      {u?.guest ? <><p className="muted">Sign in or create a free account to join. Anything you made as a guest comes with you.</p><div style={{ display: "flex", gap: 8, justifyContent: "center" }}><a className="tr-btn primary" href={`${BP}/signup?callbackUrl=${encodeURIComponent(`${BP}/app/join/${token}`)}`}>Sign up</a><a className="tr-btn" href={`${BP}/login?callbackUrl=${encodeURIComponent(`${BP}/app/join/${token}`)}`}>Log in</a></div></>
        : <JoinButton token={token} />}</>}
  </main>;
}
