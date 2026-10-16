"use client";
// App-wide client state: the signed-in user's doc, their workspaces and board tiles, plus toasts, the guest
// sign-in prompt and a small fetch helper. Board contents live in BoardProvider (one per open board).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BP } from "@/lib/basepath";
import type { BoardSummary, UserDoc, Workspace } from "@/lib/model";
import type { MePayload, PendingInvite } from "@/lib/server/data";

export type Session = { id: string; name: string; email: string; demo: boolean; guest: boolean };
type Toast = { id: number; text: string; kind: "info" | "error"; action?: { label: string; run: () => void } };
type Ctx = {
  session: Session; user: UserDoc; workspaces: Workspace[]; boards: BoardSummary[]; invites: PendingInvite[];
  refresh: () => Promise<void>; patchMe: (p: Record<string, unknown>) => Promise<void>; setBoardSummary: (b: BoardSummary) => void; setWorkspace: (w: Workspace) => void;
  call: <T = any>(method: string, path: string, body?: unknown) => Promise<T>; toast: (text: string, o?: { kind?: Toast["kind"]; action?: Toast["action"] }) => void;
  requireAccount: (why: string) => boolean; starred: (id: string) => boolean; toggleStar: (id: string) => void; theme: "light" | "dark";
};
const C = createContext<Ctx | null>(null);
export const useApp = () => { const c = useContext(C); if (!c) throw new Error("AppProvider missing"); return c; };
export class ApiError extends Error { constructor(public status: number, msg: string, public signIn = false) { super(msg); } }

export function AppProvider({ initial, session, children }: { initial: MePayload; session: Session; children: React.ReactNode }) {
  const [me, setMe] = useState(initial); const [toasts, setToasts] = useState<Toast[]>([]); const [prompt, setPrompt] = useState<string | null>(null);
  const n = useRef(0); const path = usePathname();
  const toast = useCallback((text: string, o: { kind?: Toast["kind"]; action?: Toast["action"] } = {}) => {
    const id = ++n.current; setToasts(t => [...t.slice(-3), { id, text, kind: o.kind ?? "info", action: o.action }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), o.action ? 7000 : 4000);
  }, []);
  const call = useCallback(async <T,>(method: string, p: string, body?: unknown): Promise<T> => {
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    const r = await fetch(BP + p, { method, headers: body && !isForm ? { "content-type": "application/json" } : undefined, body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { if (j.signIn) setPrompt(j.error ?? "Sign in to keep going."); throw new ApiError(r.status, j.error ?? `Request failed (${r.status})`, !!j.signIn); }
    return j as T;
  }, []);
  const refresh = useCallback(async () => { try { setMe(await call<MePayload>("GET", "/api/me")); } catch { /* keep what we have */ } }, [call]);
  const patchMe = useCallback(async (p: Record<string, unknown>) => { if (p.settings) setMe(m => ({ ...m, user: { ...m.user, settings: { ...m.user.settings, ...(p.settings as object) } } })); try { const { user } = await call<{ user: UserDoc }>("PATCH", "/api/me", p); setMe(m => ({ ...m, user })); } catch (e) { toast((e as Error).message, { kind: "error" }); } }, [call, toast]);
  const setBoardSummary = useCallback((b: BoardSummary) => setMe(m => ({ ...m, boards: m.boards.some(x => x.id === b.id) ? m.boards.map(x => (x.id === b.id ? { ...x, ...b, role: b.role ?? x.role } : x)) : [b, ...m.boards] })), []);
  const setWorkspace = useCallback((w: Workspace) => setMe(m => ({ ...m, workspaces: m.workspaces.some(x => x.id === w.id) ? m.workspaces.map(x => (x.id === w.id ? w : x)) : [...m.workspaces, w] })), []);
  const requireAccount = useCallback((why: string) => { if (!session.guest) return true; setPrompt(why); return false; }, [session.guest]);
  const starred = useCallback((id: string) => me.user.starred.includes(id), [me.user.starred]);
  const toggleStar = useCallback((id: string) => { const on = !me.user.starred.includes(id); setMe(m => ({ ...m, user: { ...m.user, starred: on ? [id, ...m.user.starred] : m.user.starred.filter(x => x !== id) } })); void patchMe({ star: { boardId: id, on } }); }, [me.user.starred, patchMe]);
  // theme: light / dark / follow the system
  const [sysDark, setSysDark] = useState(false);
  useEffect(() => { const mq = window.matchMedia("(prefers-color-scheme: dark)"); setSysDark(mq.matches); const h = (e: MediaQueryListEvent) => setSysDark(e.matches); mq.addEventListener("change", h); return () => mq.removeEventListener("change", h); }, []);
  const theme = me.user.settings.theme === "system" ? (sysDark ? "dark" : "light") : me.user.settings.theme;
  // refresh notifications and board tiles when the tab regains focus, and every minute while it's open
  useEffect(() => { const h = () => { if (document.visibilityState === "visible") void refresh(); }; document.addEventListener("visibilitychange", h); const t = setInterval(h, 60_000); return () => { document.removeEventListener("visibilitychange", h); clearInterval(t); }; }, [refresh]);
  useEffect(() => { setPrompt(null); }, [path]);
  const value = useMemo<Ctx>(() => ({ session, user: me.user, workspaces: me.workspaces, boards: me.boards, invites: me.invites, refresh, patchMe, setBoardSummary, setWorkspace, call, toast, requireAccount, starred, toggleStar, theme }),
    [session, me, refresh, patchMe, setBoardSummary, setWorkspace, call, toast, requireAccount, starred, toggleStar, theme]);
  return <C.Provider value={value}>
    <div className={"tr-app" + (me.user.settings.colorBlind ? " cb" : "")} data-theme={theme}>{children}
      <div className="tr-toasts" role="status" aria-live="polite">{toasts.map(t => <div key={t.id} className={"tr-toast " + t.kind}>{t.text}{t.action && <button onClick={() => { t.action!.run(); setToasts(x => x.filter(y => y.id !== t.id)); }}>{t.action.label}</button>}</div>)}</div>
      {prompt && <SignInPrompt why={prompt} onClose={() => setPrompt(null)} />}
    </div>
  </C.Provider>;
}

/** Guests can use everything that doesn't involve other people; sharing, invites and email need an account. */
export function SignInPrompt({ why, onClose }: { why: string; onClose: () => void }) {
  const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : BP + "/app";
  const next = encodeURIComponent(here);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  return <div className="tr-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="tr-dialog" role="dialog" aria-modal="true" aria-labelledby="signin-h">
      <h2 id="signin-h">Sign in to keep going</h2><p>{why}</p><p className="muted">Your boards come with you: everything you made as a guest moves into your account.</p>
      <div className="row"><a className="tr-btn primary" href={`${BP}/signup?callbackUrl=${next}`}>Sign up</a><a className="tr-btn" href={`${BP}/login?callbackUrl=${next}`}>Log in</a><button className="tr-btn subtle" onClick={onClose}>Not now</button></div>
    </div></div>;
}
