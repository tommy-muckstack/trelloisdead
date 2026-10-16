import { NextRequest, NextResponse } from "next/server";
import { demoEnabled, DEMO_USER, DEMO_USERS, signDemo } from "@/lib/session";
import { DEMO_COOKIE, cookieOptions } from "@/lib/isdead-auth/server";
export const runtime = "nodejs";
// Demo mode only (no Firebase needed): the demo account, or ?as=demo2 for a second persona (collaboration tests).
export async function POST(req: NextRequest) {
  if (!demoEnabled()) return NextResponse.json({ error: "Demo mode is off" }, { status: 404 });
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(DEMO_COOKIE, signDemo((DEMO_USERS.find(u => u.id === req.nextUrl.searchParams.get("as")) ?? DEMO_USER).id), cookieOptions());
  return res;
}
