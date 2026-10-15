"use client";
import { useState } from "react";
import type { FirebaseClientConfig } from "@/lib/isdead-auth/config";
import { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword, authErrorMessage } from "@/lib/isdead-auth/client";
import { BP } from "@/lib/basepath";
import "./trlogin.css";

const G = <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M23 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.2a5.3 5.3 0 01-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.4z" /><path fill="#34A853" d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A11.5 11.5 0 0012 23.5z" /><path fill="#FBBC05" d="M5.6 14.2a6.9 6.9 0 010-4.4v-3H1.8a11.5 11.5 0 000 10.4z" /><path fill="#EA4335" d="M12 5.4c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 001.8 6.8l3.8 3A6.9 6.9 0 0112 5.4z" /></svg>;
const MS = <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden><path fill="#f25022" d="M2 2h9.5v9.5H2z" /><path fill="#7fba00" d="M12.5 2H22v9.5h-9.5z" /><path fill="#00a4ef" d="M2 12.5h9.5V22H2z" /><path fill="#ffb900" d="M12.5 12.5H22V22h-9.5z" /></svg>;
const AP = <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden><path fill="#111" d="M16.4 12.6c0-2.5 2-3.7 2.1-3.8-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.5 1.3-.1 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.3-1.2 3.1-2.4 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.8-1.1-2.8-4.1zM14 5c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z" /></svg>;
const SL = <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden><rect x="3" y="9.5" width="6" height="3" rx="1.5" fill="#e01e5a" /><rect x="9.5" y="3" width="3" height="6" rx="1.5" fill="#36c5f0" /><rect x="15" y="11.5" width="6" height="3" rx="1.5" fill="#2eb67d" /><rect x="11.5" y="15" width="3" height="6" rx="1.5" fill="#ecb22e" /></svg>;
const Key = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" aria-hidden><circle cx="8" cy="15" r="4.5" /><path d="M11 12l8-8M16 7l3 3" /></svg>;
const off = "Not available yet in the open-source version";
export function TrLogin({ config, demo, to, signup = false }: { config: FirebaseClientConfig | null; demo: boolean; to: string; signup?: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">(signup ? "signup" : "signin");
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState(""), [note, setNote] = useState("");
  const session = `${BP}/api/session`;
  const run = async (f: () => Promise<void>) => { setBusy(true); setErr(""); setNote(""); try { await f(); } catch (e) { setErr(authErrorMessage(e)); } finally { setBusy(false); } };
  const submit = (e: React.FormEvent) => { e.preventDefault();
    if (!config) { setErr("Sign-in isn't configured on this deployment yet."); return; }
    if (mode === "reset") return run(async () => { await resetPassword(config, email); setNote("If that email has an account, a reset link is on its way."); setMode("signin"); setStep(1); });
    if (step === 1) { setStep(2); return; }
    run(async () => { if (mode === "signup") await signUpWithEmail(config, session, email, password); else await signInWithEmail(config, session, email, password); window.location.assign(to); }); };
  const su = mode === "signup";
  const sw = (m: "signin" | "signup" | "reset") => (e: React.MouseEvent) => { e.preventDefault(); setMode(m); setStep(1); };
  return <main className="trl">
    <div className="art l"><i className="p1" /><i className="p2" /><i className="p3" /><b className="f1" /><b className="f2" /></div>
    <div className="art r"><i className="p1" /><i className="p2" /><b className="mon" /><b className="rob" /></div>
    <div className="card">
      <div className="lg"><svg width="32" height="32" viewBox="0 0 32 32" aria-hidden><rect width="32" height="32" rx="6" fill="#0c66e4" /><rect x="6.5" y="6.5" width="8" height="17" rx="1.5" fill="#fff" /><rect x="17.5" y="6.5" width="8" height="10" rx="1.5" fill="#fff" /></svg><span>TrelloIsDead</span></div>
      <h1>{su ? "Sign up for TrelloIsDead" : mode === "reset" ? "Reset your password" : "Log in to continue"}</h1>
      <form onSubmit={submit}>
        <label htmlFor="tr-email">Email{!su && <i>*</i>}</label>
        <input id="tr-email" type="email" required autoComplete="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} readOnly={step === 2 && mode !== "reset"} />
        {step === 2 && mode !== "reset" && <><label htmlFor="tr-pass">Password</label><input id="tr-pass" type="password" required minLength={6} autoFocus autoComplete={su ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} /></>}
        {su && step === 1 && <p className="tos">By signing up, I accept the Atlassian <a>Cloud Terms of Service</a> and acknowledge the <a>Privacy Policy</a>.</p>}
        {!su && mode !== "reset" && step === 1 && <label className="rm"><input type="checkbox" /> Remember me <em>i</em></label>}
        <button className="go" disabled={busy}>{mode === "reset" ? "Send reset link" : su ? (step === 1 ? "Sign up" : "Create account") : "Continue"}</button>
      </form>
      {err && <p role="alert" className="err">{err}</p>}{note && <p role="status" className="nt">{note}</p>}
      {mode !== "reset" && <>
        {!su && <><p className="ow">Or login with:</p><button type="button" className="pv" disabled title={off}>{Key}Passkey</button></>}
        <p className="ow">Or continue with:</p>
        <button type="button" className="pv" disabled={busy || !config} onClick={() => run(async () => { await signInWithGoogle(config!, session); window.location.assign(to); })}>{G}Google</button>
        <button type="button" className="pv" disabled title={off}>{MS}Microsoft</button>
        <button type="button" className="pv" disabled title={off}>{AP}Apple</button>
        <button type="button" className="pv" disabled title={off}>{SL}Slack</button></>}
      <p className="lk">{su ? <a href="#" onClick={sw("signin")}>Already have an account? Log in</a> : mode === "reset" ? <a href="#" onClick={sw("signin")}>Back to log in</a> : <><a href="#" onClick={sw("reset")}>Can&apos;t log in?</a> &nbsp;•&nbsp; <a href="#" onClick={sw("signup")}>Create an account</a></>}</p>
      <hr />
      <div className="at"><svg width="20" height="16" viewBox="0 0 20 16" aria-hidden><path d="M6 6l6 10H0z" fill="#505f79" /><path d="M10 0l9 16h-6z" fill="#505f79" /></svg>ATLASSIAN</div>
      <p className="oa"><u>One account</u> for Trello, Jira, Confluence and more.</p>
      {!su && <p className="oa pp"><u>Privacy Policy</u> &nbsp;•&nbsp; <u>User Notice</u></p>}
      {!config && <p className="nt">Sign-in not configured. Email and Google sign-in turn on once Firebase is set up.</p>}
      {demo && <button type="button" className="demo" onClick={async () => { const r = await fetch(`${BP}/api/session/demo`, { method: "POST" }); if (r.ok) window.location.assign(to); }}>Use the demo account</button>}
    </div>
  </main>;
}
