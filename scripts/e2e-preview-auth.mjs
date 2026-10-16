// Real Firebase sign-up / reset / login against a deployed preview (creates one throwaway account). Sign-up has no email verification, like every IsDead app.
// BASE=https://<preview>/trelloisdead BYPASS=<token> node scripts/e2e-preview-auth.mjs
import { run, ok, BASE } from "./e2e-lib.mjs";
await run("e2e-preview-auth", async ({ newPage }) => {
  const email = `trelloisdead-qa-${Date.now().toString(36)}@example.com`, pass = "correct horse battery";
  const p = await newPage(); await p.goto(BASE + "/signup"); const su = p.getByTestId("auth-signup");
  ok(!(await p.getByText(/isn't configured/).count()), "Firebase is configured on this deployment");
  await su.getByLabel("Email").fill(email); await su.getByRole("button", { name: "Continue" }).click(); await su.getByLabel("Full name").fill("QA Signup"); await su.getByLabel("Password").fill(pass); await su.getByRole("button", { name: "Sign up" }).click();
  await p.waitForURL(/\/app/, { timeout: 20000 }); await p.waitForSelector("[data-testid=boards]");
  ok(await p.getByRole("button", { name: "Account: QA Signup" }).isVisible(), "sign-up goes straight into the app (no verification step), with the profile name");
  const g = await newPage(); await g.goto(BASE + "/login"); ok(await g.getByRole("button", { name: "Google" }).isEnabled(), "Google sign-in button is live (popup needs a real Google account)");
  const r = await newPage(); await r.goto(BASE + "/forgot-password"); await r.getByLabel("Email").fill(email); await r.getByRole("button", { name: "Send recovery link" }).click(); await r.getByTestId("reset-sent").waitFor({ timeout: 15000 }); ok(true, "password reset email requested → Check your inbox");
  const l = await newPage(); await l.goto(BASE + "/login"); await l.getByLabel("Email").fill(email); await l.getByRole("button", { name: "Continue" }).click(); await l.getByLabel("Password").fill(pass); await l.getByRole("button", { name: "Log in", exact: true }).click();
  await l.waitForURL(/\/app/, { timeout: 20000 }); await l.waitForSelector("[data-testid=boards]"); ok(await l.getByRole("button", { name: "Account: QA Signup" }).isVisible(), "login with email + password reaches the app with the profile name");
});
