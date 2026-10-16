import { api, body } from "@/lib/server/http";
import { transfer, HttpError } from "@/lib/server/data";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
/** POST { kind: "card"|"list", copy, fromBoard, itemId, toBoard, toList?, index } — move/copy to another board. */
export const POST = api(async (u, req) => {
  const b = await body(req); if (!["card", "list"].includes(b.kind) || typeof b.fromBoard !== "string" || typeof b.toBoard !== "string" || typeof b.itemId !== "string") throw new HttpError(400, "Bad request");
  return transfer(u, { kind: b.kind, copy: !!b.copy, fromBoard: b.fromBoard, itemId: b.itemId, toBoard: b.toBoard, toList: typeof b.toList === "string" ? b.toList : undefined, index: Number.isFinite(b.index) ? b.index : 1e6 });
});
