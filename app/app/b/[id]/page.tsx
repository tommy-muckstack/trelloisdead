import { Suspense } from "react";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import { access } from "@/lib/server/data";
import { BoardScreen } from "@/components/board/BoardScreen";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) { const u = await currentUser(); const a = u ? await access(u.id, (await params).id) : null; return { title: a ? `${a.board.title} | TrelloIsDead` : "Board not found | TrelloIsDead" }; }
export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser(); const a = u ? await access(u.id, (await params).id) : null;
  if (!a) return <main className="tr-main" style={{ margin: "0 auto", textAlign: "center" }} data-testid="board-missing"><h1 style={{ fontSize: 24 }}>Board not found</h1><p className="muted">This board may be private. If someone gave you this link, they may need to invite you to the board.</p><Link className="tr-btn primary" href="/app">Go to your boards</Link></main>;
  return <Suspense><BoardScreen initial={a.board} role={a.role} via={a.via} /></Suspense>;
}
