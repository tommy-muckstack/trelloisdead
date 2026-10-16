import { NextResponse } from "next/server";
import { currentUser, type SessionUser } from "@/lib/session";
import { HttpError } from "@/lib/server/data";
/** JSON route wrapper: resolves the session (401 without one), maps HttpError to its status. */
export function api<C = unknown>(fn: (u: SessionUser, req: Request, ctx: C) => Promise<unknown>, o: { guestOk?: boolean } = { guestOk: true }) {
  return async (req: Request, ctx: C) => {
    const u = await currentUser(); if (!u) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
    if (o.guestOk === false && u.guest) return NextResponse.json({ error: "Sign in to do that.", signIn: true }, { status: 401 });
    try { const out = await fn(u, req, ctx); return out instanceof Response ? out : NextResponse.json(out ?? { ok: true }); }
    catch (e) { if (e instanceof HttpError) return NextResponse.json({ error: e.message, ...(e.status === 401 ? { signIn: true } : {}) }, { status: e.status }); console.warn("[api]", e); return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 }); }
  };
}
export const body = async (req: Request) => { try { return (await req.json()) as any; } catch { throw new HttpError(400, "Bad JSON"); } };
export type Params<T extends string> = { params: Promise<Record<T, string>> };
