"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app/AppProvider";
export function JoinButton({ token }: { token: string }) {
  const app = useApp(); const router = useRouter(); const [busy, setBusy] = useState(false);
  return <button className="tr-btn primary" disabled={busy} onClick={async () => { setBusy(true); try { const { to } = await app.call<{ to: string }>("POST", `/api/join/${token}`); await app.refresh(); router.push(to); } catch (e) { app.toast((e as Error).message, { kind: "error" }); setBusy(false); } }}>{busy ? "Joining…" : "Join"}</button>;
}
