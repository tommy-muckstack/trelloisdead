import { api, body, type Params } from "@/lib/server/http";
import { patchWorkspace, deleteWorkspace } from "@/lib/server/data";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export const PATCH = api<Params<"id">>(async (u, req, { params }) => ({ workspace: await patchWorkspace(u, (await params).id, await body(req)) }));
export const DELETE = api<Params<"id">>(async (u, _r, { params }) => { await deleteWorkspace(u, (await params).id); return { ok: true }; });
