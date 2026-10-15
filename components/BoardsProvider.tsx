"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { State } from "@/lib/board";
import { BP } from "@/lib/basepath";
type Save = "saved" | "saving" | "error";
type Ctx = { state: State; update: (f: (s: State) => State) => void; save: Save };
const C = createContext<Ctx | null>(null);
export const useBoards = () => { const c = useContext(C); if (!c) throw new Error("BoardsProvider missing"); return c; };
/** Holds the user's boards, applies pure operations, and debounces a PUT to /api/state (server copy = same boards on every device). */
export function BoardsProvider({ initial, children }: { initial: State; children: React.ReactNode }) {
  const [state, setState] = useState(initial); const [save, setSave] = useState<Save>("saved");
  const latest = useRef(state); const timer = useRef<ReturnType<typeof setTimeout> | null>(null); const dirty = useRef(false);
  const flush = useCallback(async (keepalive = false) => {
    if (!dirty.current) return; dirty.current = false; setSave("saving");
    try { const r = await fetch(`${BP}/api/state`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(latest.current), keepalive }); if (!r.ok) throw new Error(); if (!dirty.current) setSave("saved"); } catch { dirty.current = true; setSave("error"); }
  }, []);
  const update = useCallback((f: (s: State) => State) => { setState(s => { const n = f(s); latest.current = n; return n; }); dirty.current = true; setSave("saving"); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => flush(), 500); }, [flush]);
  useEffect(() => { const h = () => { if (dirty.current) flush(true); }; window.addEventListener("pagehide", h); return () => { window.removeEventListener("pagehide", h); if (timer.current) clearTimeout(timer.current); }; }, [flush]);
  return <C.Provider value={{ state, update, save }}>{children}</C.Provider>;
}
export function SaveBadge() { const { save } = useBoards(); return <span className="ids-muted" role="status" data-testid="save-state" style={{ fontSize: 13 }}>{save === "saving" ? "Saving…" : save === "error" ? "Not saved. Retrying on next change" : "Saved"}</span>; }
