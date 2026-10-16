import { api, body } from "@/lib/server/http";
import { answerInvite, HttpError } from "@/lib/server/data";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export const POST = api(async (u, req) => { const b = await body(req); if (!["workspace", "board"].includes(b.kind) || typeof b.id !== "string") throw new HttpError(400, "Bad request"); return (await answerInvite(u, b.kind, b.id, !!b.accept)) ?? { ok: true }; }, { guestOk: false });
