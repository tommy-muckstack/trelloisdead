import { api, body, type Params } from "@/lib/server/http";
import { access, applyActions, deleteBoard, HttpError } from "@/lib/server/data";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
type P = Params<"id">;
/** GET ?v=<version>: { same: true } when nothing changed since that version (cheap polling for collaborators' edits). */
export const GET = api<P>(async (u, req, { params }) => {
  const { id } = await params; const acc = await access(u.id, id); if (!acc) throw new HttpError(404, "This board doesn't exist, or you don't have access to it.");
  const v = new URL(req.url).searchParams.get("v"); if (v !== null && Number(v) === acc.board.version) return { same: true, version: acc.board.version };
  return { board: acc.board, role: acc.role, via: acc.via };
});
/** POST { actions: Action[] } → applies them in order; returns the stored board. */
export const POST = api<P>(async (u, req, { params }) => {
  const { id } = await params; const b = await body(req); if (!Array.isArray(b.actions)) throw new HttpError(400, "actions[] required");
  const acc = await access(u.id, id); if (!acc) throw new HttpError(404, "This board doesn't exist, or you don't have access to it.");
  if (!acc.role && !b.actions.every((a: any) => a?.t === "card.watch")) throw new HttpError(403, acc.via === "workspace" ? "Join this board to make changes." : "You need to be a board member to edit this board.");
  return { board: await applyActions(u, id, b.actions) };
});
export const DELETE = api<P>(async (u, _req, { params }) => { await deleteBoard(u, (await params).id); return { ok: true }; });
