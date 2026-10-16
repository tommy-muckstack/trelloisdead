import { api } from "@/lib/server/http";
import { myCards } from "@/lib/server/data";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export const GET = api(async u => ({ cards: await myCards(u) }));
