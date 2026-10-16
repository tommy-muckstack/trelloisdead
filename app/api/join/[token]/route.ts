import { api, type Params } from "@/lib/server/http";
import { joinByToken } from "@/lib/server/data";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export const POST = api<Params<"token">>(async (u, _r, { params }) => ({ to: await joinByToken(u, (await params).token) }), { guestOk: false });
