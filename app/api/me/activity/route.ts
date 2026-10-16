import { api } from "@/lib/server/http";
import { myActivity } from "@/lib/server/data";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export const GET = api(async u => ({ activity: await myActivity(u) }));
