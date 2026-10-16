import { api, body } from "@/lib/server/http";
import { createBoard, HttpError } from "@/lib/server/data";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export const POST = api(async (u, req) => {
  const b = await body(req); if (typeof b.workspaceId !== "string") throw new HttpError(400, "Pick a Workspace");
  if (!b.template && !b.fromBoard && !(typeof b.title === "string" && b.title.trim())) throw new HttpError(400, "Board title is required");
  const board = await createBoard(u, { title: String(b.title ?? ""), bg: typeof b.bg === "string" ? b.bg : undefined, workspaceId: b.workspaceId, visibility: b.visibility, template: typeof b.template === "string" ? b.template : undefined, fromBoard: typeof b.fromBoard === "string" ? b.fromBoard : undefined, keepCards: b.keepCards !== false });
  return { board };
});
