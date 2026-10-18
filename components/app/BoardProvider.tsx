"use client";
// One open board. What you see = the last board the server confirmed + your not-yet-confirmed actions replayed on
// top. Actions are sent in small batches; the server applies them to the latest stored board (so a collaborator's
// edits are never overwritten) and returns the result. While idle, the board polls for other people's changes.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { applyAction, inverse, type Action, type ActionBody } from "@/lib/actions";
import { summary, uid, type Board, type Role } from "@/lib/model";
import { useApp } from "@/components/app/AppProvider";
import { track } from "@/lib/analytics";
import { actionEvent } from "@/lib/analytics/boardEvents";

type Save = "saved" | "saving" | "error" | "offline";
type Ctx = {
  board: Board; role: Role | null; via: "member" | "workspace" | "public"; me: string; save: Save;
  dispatch: (body: ActionBody, o?: { undoable?: boolean; redo?: boolean }) => void; undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean;
  lastAction: ActionBody | null; reload: () => Promise<void>; replace: (b: Board, role?: Role | null) => void; editable: boolean;
};
const C = createContext<Ctx | null>(null);
export const useBoard = () => { const c = useContext(C); if (!c) throw new Error("BoardProvider missing"); return c; };
export const useBoardMaybe = () => useContext(C);

export function BoardProvider({ initial, role: role0, via: via0, children }: { initial: Board; role: Role | null; via: "member" | "workspace" | "public"; children: React.ReactNode }) {
  const app = useApp(); const me = app.user.id;
  const [server, setServer] = useState(initial); const [pending, setPending] = useState<Action[]>([]); const [role, setRole] = useState(role0); const [via, setVia] = useState(via0);
  const [save, setSave] = useState<Save>("saved"); const [lastAction, setLast] = useState<ActionBody | null>(null);
  const pendingRef = useRef<Action[]>([]); const inFlight = useRef(false); const serverRef = useRef(initial); const timer = useRef<ReturnType<typeof setTimeout> | null>(null); const failing = useRef(false); // back off to 3s while the server is failing
  const board = useMemo(() => pending.reduce(applyAction, server), [server, pending]);
  const boardRef = useRef(board); boardRef.current = board;
  const setPendingBoth = (p: Action[]) => { pendingRef.current = p; setPending(p); };

  const flush = useCallback(async () => {
    if (inFlight.current || !pendingRef.current.length) return;
    inFlight.current = true; const batch = pendingRef.current.slice(0, 50); setSave("saving");
    try {
      const { board: b } = await app.call<{ board: Board }>("POST", `/api/b/${serverRef.current.id}`, { actions: batch.map(({ by: _b, byName: _n, at: _a, ...rest }) => rest) });
      failing.current = false; serverRef.current = b; setServer(b); setPendingBoth(pendingRef.current.slice(batch.length)); setSave(pendingRef.current.length ? "saving" : "saved");
      app.setBoardSummary(summary(b, me));
    } catch (e) {
      const status = (e as { status?: number }).status ?? 0;
      if (status >= 400 && status < 500) { setPendingBoth(pendingRef.current.slice(batch.length)); setSave("saved"); app.toast((e as Error).message, { kind: "error" }); void reloadRef.current(); }
      else { failing.current = true; setSave(navigator.onLine ? "error" : "offline"); }
    } finally { inFlight.current = false; if (pendingRef.current.length) timer.current = setTimeout(() => void flush(), failing.current ? 3000 : 150); }
  }, [app, me]);

  const undoRef = useRef<ActionBody[]>([]); const redoRef = useRef<ActionBody[]>([]); const [, bump] = useState(0);
  const enqueue = useCallback((a: Action, delay: number) => { setPendingBoth([...pendingRef.current, a]); setSave("saving"); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => void flush(), delay); }, [flush]);
  const stamp = useCallback((body: ActionBody) => ({ ...body, id: uid("a"), at: new Date().toISOString(), by: me, byName: app.user.name }) as Action, [me, app.user.name]);
  const dispatch = useCallback((body: ActionBody, o: { undoable?: boolean; redo?: boolean } = {}) => {
    const a = stamp(body);
    if (o.undoable !== false) { const inv = inverse(boardRef.current, a, ""); if (inv) { undoRef.current = [...undoRef.current.slice(-49), inv]; if (!o.redo) redoRef.current = []; bump(x => x + 1); } }
    const ev = actionEvent(body, boardRef.current); if (ev) track(ev[0], ev[1]);
    setLast(body); enqueue(a, 120);
  }, [stamp, enqueue]);
  const undo = useCallback(() => { const last = undoRef.current.pop(); if (!last) return; const a = stamp(last); const back = inverse(boardRef.current, a, ""); if (back) redoRef.current = [...redoRef.current, back]; bump(x => x + 1); enqueue(a, 60); }, [stamp, enqueue]);
  const redo = useCallback(() => { const last = redoRef.current.pop(); if (!last) return; bump(x => x + 1); dispatch(last, { redo: true }); }, [dispatch]);

  const reload = useCallback(async () => {
    try { const r = await app.call<{ board?: Board; same?: boolean; role: Role | null; via: Ctx["via"] }>("GET", `/api/b/${serverRef.current.id}${pendingRef.current.length ? "" : `?v=${serverRef.current.version}`}`);
      if (r.board && !pendingRef.current.length && !inFlight.current) { serverRef.current = r.board; setServer(r.board); setRole(r.role); setVia(r.via); }
    } catch { /* offline or lost access; next poll retries */ }
  }, [app]);
  const reloadRef = useRef(reload); reloadRef.current = reload;
  const replace = useCallback((b: Board, r?: Role | null) => { serverRef.current = b; setServer(b); if (r !== undefined) setRole(r); else { const m = b.members.find(x => x.id === me); setRole(m?.role ?? null); if (m) setVia("member"); } app.setBoardSummary(summary(b, me)); }, [app, me]);

  // poll for collaborators' edits (every 4s while visible), save on tab hide
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible" && !pendingRef.current.length && !inFlight.current) void reloadRef.current(); }, 4000);
    const hide = () => { if (pendingRef.current.length) void flush(); };
    window.addEventListener("pagehide", hide); document.addEventListener("visibilitychange", hide);
    const online = () => { if (pendingRef.current.length) void flush(); }; window.addEventListener("online", online);
    return () => { clearInterval(t); window.removeEventListener("pagehide", hide); document.removeEventListener("visibilitychange", hide); window.removeEventListener("online", online); };
  }, [flush]);
  useEffect(() => { if (initial.id !== serverRef.current.id) { serverRef.current = initial; setServer(initial); setPendingBoth([]); setRole(role0); setVia(via0); undoRef.current = []; redoRef.current = []; } }, [initial, role0, via0]);
  // warn before closing the tab with unsaved changes
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (pendingRef.current.length) { e.preventDefault(); } }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, []);

  const editable = !!role && role !== "observer" && !board.closed;
  const value = useMemo<Ctx>(() => ({ board, role, via, me, save, dispatch, undo, redo, canUndo: undoRef.current.length > 0, canRedo: redoRef.current.length > 0, lastAction, reload, replace, editable }),
    [board, role, via, me, save, dispatch, undo, redo, lastAction, reload, replace, editable, undoRef.current.length, redoRef.current.length]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function SaveState() {
  const { save } = useBoard();
  return <span className="tr-save" role="status" data-testid="save-state">{save === "saving" ? "Saving…" : save === "error" ? "Not saved, retrying…" : save === "offline" ? "Offline, will save when you're back" : "Saved"}</span>;
}
