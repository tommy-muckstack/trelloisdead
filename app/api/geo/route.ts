import { api } from "@/lib/server/http";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
// Card locations: place search through OpenStreetMap's Nominatim (free; usage policy: identify the app, max ~1 request/second, cache results).
const cache = new Map<string, unknown>(); let last = 0;
export const GET = api(async (_u, req) => {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 200); if (q.length < 3) return { places: [] };
  if (cache.has(q)) return cache.get(q);
  const wait = 1100 - (Date.now() - last); if (wait > 0) await new Promise(r => setTimeout(r, wait)); last = Date.now();
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(q)}`, { headers: { "user-agent": "TrelloIsDead/1.0 (+https://yourappisdead.com/trelloisdead; open-source kanban)", "accept-language": "en" } }).catch(() => null);
  if (!r?.ok) return { places: [], error: "Place search is unavailable right now." };
  const rows = (await r.json()) as { display_name: string; name?: string; lat: string; lon: string }[];
  const out = { places: rows.map(x => ({ name: x.name || x.display_name.split(",")[0], address: x.display_name, lat: Number(x.lat), lng: Number(x.lon) })) };
  if (cache.size > 500) cache.clear(); cache.set(q, out); return out;
});
