import { api, body, type Params } from "@/lib/server/http";
import { inviteLink, disableInviteLink } from "@/lib/server/data";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export const POST = api<Params<"id">>(async (u, req, { params }) => ({ token: await inviteLink(u, "board", (await params).id, !!(await body(req)).reset) }), { guestOk: false });
export const DELETE = api<Params<"id">>(async (u, _r, { params }) => { await disableInviteLink(u, "board", (await params).id); return { ok: true }; }, { guestOk: false });
