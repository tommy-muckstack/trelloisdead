import { api, body } from "@/lib/server/http";
import { loadMe, patchUser } from "@/lib/server/data";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export const GET = api(async u => loadMe(u));
export const PATCH = api(async (u, req) => { const user = await patchUser(u, await body(req)); return { user }; });
