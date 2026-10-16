"use client";
// The board renders in the browser only: dates, "due soon" states and relative times depend on the viewer's clock
// and time zone, which the server (UTC) can't know. The shell shows the board background while it loads.
import dynamic from "next/dynamic";
import { bgCss, type Board, type Role } from "@/lib/model";
const BoardScreen = dynamic(() => import("@/components/board/BoardScreen").then(m => m.BoardScreen), { ssr: false, loading: () => null });
export function BoardClient({ initial, role, via }: { initial: Board; role: Role | null; via: "member" | "workspace" | "public" }) {
  return <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", background: bgCss(initial.bg) }}><BoardScreen initial={initial} role={role} via={via} /></div>;
}
