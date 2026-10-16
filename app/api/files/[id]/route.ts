import { currentUser } from "@/lib/session";
import { readFile } from "@/lib/server/data";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const INLINE = /^(image\/(png|jpeg|gif|webp|avif)|application\/pdf|video\/(mp4|webm)|audio\/(mpeg|ogg|wav)|text\/plain)$/;
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const f = await readFile(await currentUser(), (await params).id, new URL(req.url).searchParams.get("b"));
  if (!f) return new Response("Not found", { status: 404 });
  const inline = INLINE.test(f.meta.mime) && new URL(req.url).searchParams.get("download") === null;
  const name = encodeURIComponent(f.meta.name);
  return new Response(new Uint8Array(f.bytes), { headers: {
    "content-type": inline ? f.meta.mime : "application/octet-stream", "content-length": String(f.bytes.length),
    "content-disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${name}`, "x-content-type-options": "nosniff",
    "content-security-policy": "sandbox; default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'", "cache-control": f.meta.kind === "attachment" ? "private, max-age=3600" : "public, max-age=31536000, immutable",
  } });
}
