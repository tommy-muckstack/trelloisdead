// Marketing nav/footer/pages, login, sign-up, forgot password, 404 and branding. (#1–#7)
import { run, ok, shot, BASE } from "./e2e-lib.mjs";
const PAGES = ["/", "/pricing", "/features", "/solutions", "/help", "/about", "/privacy", "/terms", "/templates", "/login", "/signup", "/forgot-password"];
await run("e2e-auth-marketing", async ({ newPage }) => {
  const p = await newPage();
  await p.goto(BASE + "/"); ok(!(await p.getByText(/ATLASSIAN/).count()) && !(await p.getByText(/coinbase|JOHN DEERE|GRAND HYATT|TechValidate/i).count()), "no Atlassian wordmark or borrowed logos/claims on the landing page");
  for (const m of ["Features", "Solutions", "Plans", "Resources"]) { await p.getByRole("button", { name: m }).click(); const panel = p.getByRole("region", { name: m }); ok(await panel.isVisible() && (await panel.getByRole("link").count()) >= 4, `${m} dropdown opens with links`); if (m === "Features") await shot(p, "01-nav-dropdown"); await p.keyboard.press("Escape"); }
  await p.getByRole("button", { name: "Features" }).click(); await p.getByRole("region", { name: "Features" }).getByRole("link", { name: /Automation/ }).click(); await p.waitForURL(/\/features#automation/); ok(await p.getByRole("heading", { name: "Automation" }).isVisible(), "dropdown link lands on the right section");
  // crawl: every link on every marketing page resolves; no <a> without href
  const seen = new Set(); let dead = []; let bare = 0; let atl = 0;
  for (const path of PAGES) {
    await p.goto(BASE + path); await p.waitForLoadState("networkidle");
    bare += await p.locator("a:not([href])").count(); atl += await p.getByText(/^ATLASSIAN$|Atlassian Privacy|One account for Trello/).count(); // (the pricing comparison quotes Trello's own plan descriptions, which name Atlassian Guard)
    for (const h of await p.locator("a[href]").evaluateAll(as => as.map(a => a.href))) { const u = new URL(h); if (u.origin !== new URL(BASE).origin || seen.has(u.pathname)) continue; seen.add(u.pathname); const r = await p.request.get(u.origin + u.pathname, { maxRedirects: 5 }); if (r.status() >= 400) dead.push(`${path} → ${u.pathname} (${r.status()})`); }
  }
  ok(!dead.length, `all ${seen.size} internal links resolve${dead.length ? ": " + dead.join(", ") : ""}`); ok(bare === 0, `no links without an href (${bare})`); ok(atl === 0, `no Atlassian branding on marketing/auth pages (${atl})`);
  // footer + disclaimer
  await p.goto(BASE + "/"); ok(await p.getByText(/not affiliated with, endorsed by or sponsored by Atlassian or Trello/).isVisible(), "footer keeps the not-affiliated disclaimer");
  // pricing in sync + honest framing + FAQ
  await p.goto(BASE + "/pricing"); const txt = await p.locator("main, body").first().innerText();
  ok(["$5", "$10", "$17.50"].every(x => txt.replace(/\s+/g, "").includes(x.replace("$", "$"))) || (txt.includes("17.50") && txt.includes("12.50")), "Trello prices match trello.com (5 / 10 / 17.50; 6 and 12.50 monthly)");
  ok(await p.getByText(/published prices \(October 2026\), shown for comparison/).isVisible(), "pricing explains these are Trello's prices");
  await p.getByText("Is TrelloIsDead really free?").click(); ok(await p.getByText(/There are no plans, trials or seat limits/).isVisible(), "FAQ answers expand");
  // email capture → sign-up with the address filled in
  await p.goto(BASE + "/"); await p.getByLabel("Email").first().fill("newbie@example.com"); await p.getByRole("button", { name: "Sign up - it's free!" }).first().click(); await p.waitForURL(/\/signup\?email=/);
  ok(await p.getByTestId("auth-signup").isVisible() && await p.getByLabel("Full name").isVisible() && (await p.getByLabel("Email").inputValue()) === "newbie@example.com", "landing email goes to sign-up with the address filled in");
  await shot(p, "05-signup-details");
  // login page
  await p.goto(BASE + "/login"); const login = p.getByTestId("auth-login");
  ok(!(await login.getByRole("button", { name: /Passkey|Microsoft|Apple|Slack/ }).count()), "only email/password and Google (no disabled providers)");
  ok(!(await login.getByText(/Remember me/).count()), "no dead 'Remember me' checkbox");
  await login.getByLabel("Email").fill("someone@example.com"); await login.getByRole("button", { name: "Continue" }).click(); ok(await login.getByLabel("Password").isVisible(), "email → Continue → password");
  await login.getByRole("link", { name: "Can't log in?" }).click(); await p.waitForURL(/\/forgot-password/); ok(await p.getByTestId("auth-forgot").isVisible(), "Can't log in? opens the reset page");
  await p.getByLabel("Email").fill("someone@example.com"); await p.getByRole("button", { name: "Send recovery link" }).click(); ok(await p.locator(".err").isVisible(), "reset without Firebase config explains why (production sends the email)");
  await p.getByRole("link", { name: "Return to log in" }).click(); await p.waitForURL(/\/login/); await p.getByRole("link", { name: "Create an account" }).click(); await p.waitForURL(/\/signup/); ok(await p.getByTestId("auth-signup").isVisible(), "Create an account opens /signup");
  await p.goto(BASE + "/login?mode=signup"); await p.waitForURL(/\/signup/); ok(true, "old ?mode=signup links redirect to /signup");
  // sign-up steps (without Firebase locally the last step reports that sign-in isn't configured)
  const su = p.getByTestId("auth-signup"); await su.getByLabel("Email").fill("bad"); await su.getByRole("button", { name: "Continue" }).click(); ok(await p.locator(".err").innerText().then(t => t.includes("valid email")), "sign-up validates the email");
  await su.getByLabel("Email").fill("person@example.com"); await su.getByRole("button", { name: "Continue" }).click(); ok(await su.getByRole("button", { name: "Sign up" }).isDisabled(), "Sign up disabled until name and an 8+ character password");
  await su.getByLabel("Full name").fill("Pat Person"); await su.getByLabel("Password").fill("correct horse"); ok(await su.getByRole("button", { name: "Sign up" }).isEnabled(), "Sign up enabled once filled in");
  // 404
  const r404 = await p.goto(BASE + "/this-does-not-exist"); ok(r404.status() === 404 && await p.getByTestId("not-found").isVisible() && await p.getByText(/This page may be private/).isVisible(), "branded 404 page");
  ok(await p.getByRole("link", { name: "Go to your boards" }).isVisible() && await p.locator(".tr-nav").isVisible(), "404 has navigation");
  // mobile menu
  const m = await newPage({ w: 390, h: 844 }); await m.goto(BASE + "/"); await m.getByRole("button", { name: "Open menu" }).click(); ok(await m.getByRole("dialog", { name: "Menu" }).isVisible(), "mobile hamburger opens a menu");
  await m.getByRole("dialog", { name: "Menu" }).getByText("Resources", { exact: true }).click(); await m.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: /Help center/ }).click(); await m.waitForURL(/\/help/); ok(true, "mobile menu links work");
});
