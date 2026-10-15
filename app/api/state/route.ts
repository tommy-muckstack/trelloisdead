import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { putDoc } from "@/lib/store";
import { sanitizeState } from "@/lib/board";
import { loadState } from "@/lib/boards-server";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function GET() {
  const u = await currentUser(); if (!u) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  return NextResponse.json(await loadState(u.id, u.demo));
}
export async function PUT(req: NextRequest) {
  const u = await currentUser(); if (!u) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const text = await req.text(); if (text.length > 2_000_000) return NextResponse.json({ error: "Too large" }, { status: 413 });
  let body: unknown; try { body = JSON.parse(text); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }
  const s = sanitizeState(body); if (!s) return NextResponse.json({ error: "Bad state" }, { status: 400 });
  await putDoc("boards", u.id, s); return NextResponse.json({ ok: true });
}
