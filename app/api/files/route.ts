import { api } from "@/lib/server/http";
import { saveFile, HttpError, MAX_UPLOAD } from "@/lib/server/data";
import { uploadUrl } from "@/lib/model";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
/** multipart: file, kind (attachment|background|avatar), boardId? → { id, url, name, mime, size } */
export const POST = api(async (u, req) => {
  const len = Number(req.headers.get("content-length") ?? 0); if (len > MAX_UPLOAD + 64 * 1024) throw new HttpError(413, "Files can be up to 4 MB here.");
  const fd = await req.formData().catch(() => { throw new HttpError(400, "Upload a file"); }); const f = fd.get("file"); if (!(f instanceof File)) throw new HttpError(400, "Upload a file");
  const kind = fd.get("kind") === "background" ? "background" : fd.get("kind") === "avatar" ? "avatar" : "attachment"; const boardId = typeof fd.get("boardId") === "string" && fd.get("boardId") ? String(fd.get("boardId")) : null;
  const meta = await saveFile(u, { name: f.name, mime: f.type, bytes: new Uint8Array(await f.arrayBuffer()), kind, boardId });
  return { id: meta.id, url: uploadUrl(meta.id), name: meta.name, mime: meta.mime, size: meta.size };
});
