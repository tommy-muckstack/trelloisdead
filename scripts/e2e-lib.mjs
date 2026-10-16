// Shared Playwright helpers for the e2e scripts. BASE=http://localhost:3019/trelloisdead node scripts/e2e-<area>.mjs
// Against a protected Vercel preview: BASE=https://<preview>/trelloisdead BYPASS=<protection bypass token>.
import { chromium } from "@playwright/test";
export const BASE = process.env.BASE || "http://localhost:3019/trelloisdead";
let failures = 0;
export function ok(cond, msg) { if (cond) console.log("  ✓ " + msg); else { failures++; console.log("  ✗ " + msg); } }
export async function run(name, fn) {
  const browser = await chromium.launch({ headless: process.env.HEADED !== "1" });
  const errors = [];
  const newPage = async (o = {}) => { const ctx = await browser.newContext({ ...(process.env.BYPASS ? { extraHTTPHeaders: { "x-vercel-protection-bypass": process.env.BYPASS, "x-vercel-set-bypass-cookie": "true" } } : {}), permissions: ["clipboard-read", "clipboard-write"], viewport: { width: o.w ?? 1440, height: o.h ?? 900 }, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36" }); const page = await ctx.newPage();
    page.on("pageerror", e => errors.push("pageerror: " + e.message)); page.on("console", m => { if (m.type() === "error" && !/Failed to load resource: the server responded with a status of (404|401|403)/.test(m.text())) errors.push(m.text()); }); return page; };
  console.log(name);
  try { await fn({ browser, newPage }); } catch (e) { failures++; console.log("  ✗ threw: " + (e?.stack ?? e)); }
  ok(errors.length === 0, "no console errors" + (errors.length ? ": " + errors.slice(0, 5).join(" | ") : ""));
  await browser.close();
  console.log(failures ? `${failures} FAILED` : "all passed"); process.exit(failures ? 1 : 0);
}
/** Fresh guest session landing on /app. */
export async function guest(newPage, o) { const p = await newPage(o); await p.goto(BASE + "/app"); await p.waitForURL(/\/app$/); await p.waitForSelector("[data-testid=boards]"); return p; }
export const api = (p, method, path, body) => p.evaluate(async ([m, u, b]) => { const r = await fetch(u, { method: m, headers: b ? { "content-type": "application/json" } : {}, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, json: await r.json().catch(() => null) }; }, [method, BASE + path, body]);
export const settle = (p, ms = 400) => p.waitForTimeout(ms);
/** Wait until the board's save indicator says Saved. */
export const saved = p => p.waitForFunction(() => document.querySelector("[data-testid=save-state]")?.textContent === "Saved", null, { timeout: 8000 });
/** Sign in as a demo persona (dev/demo mode only): "demo" (Demo User) or "demo2" (Sam Rivera). */
export async function demo(newPage, as = "demo", o) { const p = await newPage(o); await p.goto(BASE + "/login"); await p.evaluate(async ([u]) => { await fetch(u, { method: "POST" }); }, [`${BASE}/api/session/demo?as=${as}`]); await p.goto(BASE + "/app"); await p.waitForSelector("[data-testid=boards]"); return p; }
/** SHOTS=1 saves docs/qa/2026-10-16/after-<name>.png (used for PR before/after images). */
export async function shot(p, name, o = {}) { if (process.env.SHOTS !== "1") return; const fs = await import("node:fs"); fs.mkdirSync("docs/qa/2026-10-16", { recursive: true }); await p.waitForTimeout(250); await p.screenshot({ path: `docs/qa/2026-10-16/after-${name}.png`, ...o }); }
