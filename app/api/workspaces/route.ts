import { api, body } from "@/lib/server/http";
import { createWorkspace } from "@/lib/server/data";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export const POST = api(async (u, req) => { const b = await body(req); return { workspace: await createWorkspace(u, { name: String(b.name ?? ""), type: b.type, desc: b.desc }) }; });
