import { api, body, type Params } from "@/lib/server/http";
import { inviteToWorkspace, setWorkspaceRole, cancelWorkspaceInvite, HttpError } from "@/lib/server/data";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
type P = Params<"id">;
export const POST = api<P>(async (u, req, { params }) => { const b = await body(req); if (typeof b.email !== "string") throw new HttpError(400, "Email required"); return inviteToWorkspace(u, (await params).id, b.email.trim(), b.role === "admin" ? "admin" : "normal"); });
/** PATCH { userId, role: "admin"|"normal"|null } — null removes the member (or leaves, for yourself). */
export const PATCH = api<P>(async (u, req, { params }) => { const b = await body(req); if (typeof b.userId !== "string") throw new HttpError(400, "userId required"); return { workspace: await setWorkspaceRole(u, (await params).id, b.userId, b.role === "admin" || b.role === "normal" ? b.role : null) }; });
export const DELETE = api<P>(async (u, req, { params }) => { const email = new URL(req.url).searchParams.get("email") ?? ""; await cancelWorkspaceInvite(u, (await params).id, email); return { ok: true }; });
