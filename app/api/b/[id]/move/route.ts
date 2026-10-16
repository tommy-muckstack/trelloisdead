import { api, body, type Params } from "@/lib/server/http";
import { moveBoard, HttpError } from "@/lib/server/data";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export const POST = api<Params<"id">>(async (u, req, { params }) => { const b = await body(req); if (typeof b.workspaceId !== "string") throw new HttpError(400, "workspaceId required"); return { board: await moveBoard(u, (await params).id, b.workspaceId) }; });
