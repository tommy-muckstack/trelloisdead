import { api, body, type Params } from "@/lib/server/http";
import { inviteToBoard, joinBoard, HttpError } from "@/lib/server/data";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
/** POST { join: true } joins a Workspace-visible board; POST { email, role } invites someone. */
export const POST = api<Params<"id">>(async (u, req, { params }) => {
  const { id } = await params; const b = await body(req);
  if (b.join) return { board: await joinBoard(u, id) };
  if (typeof b.email !== "string") throw new HttpError(400, "Email required");
  return inviteToBoard(u, id, b.email.trim(), b.role === "admin" || b.role === "observer" ? b.role : "normal");
});
