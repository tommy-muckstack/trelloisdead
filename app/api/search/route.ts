import { api } from "@/lib/server/http";
import { search } from "@/lib/server/data";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export const GET = api(async (u, req) => search(u, (new URL(req.url).searchParams.get("q") ?? "").slice(0, 300)));
