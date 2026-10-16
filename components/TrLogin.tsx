"use client";
// Log in, sign up (email → name + password → verify your email) and password reset. Email/password and Google only.
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FirebaseClientConfig } from "@/lib/isdead-auth/config";
import { signInWithEmail, signInWithGoogle, resetPassword, authErrorMessage, createAccount, resendVerification, finishVerifiedSignUp, abandonSignUp } from "@/lib/isdead-auth/client";
import { BP } from "@/lib/basepath";
import { Mark } from "@/components/Mark";
import "./trlogin.css";

const G = <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M23 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.2a5.3 5.3 0 01-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.4z" /><path fill="#34A853" d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A11.5 11.5 0 0012 23.5z" /><path fill="#FBBC05" d="M5.6 14.2a6.9 6.9 0 010-4.4v-3H1.8a11.5 11.5 0 000 10.4z" /><path fill="#EA4335" d="M12 5.4c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 001.8 6.8l3.8 3A6.9 6.9 0 0112 5.4z" /></svg>;
export type AuthMode = "login" | "signup" | "forgot";
export function TrLogin({ config, demo, to, mode, email: email0 = "" }: { config: FirebaseClientConfig | null; demo: boolean; to: string; mode: AuthMode; email?: string }) {
  const [step, setStep] = useState<"email" | "details" | "verify" | "sent">(mode === "signup" && email0 ? "details" : "email");
  const [email, setEmail] = useState(email0), [password, setPassword] = useState(""), [name, setName] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState(""), [note, setNote] = useState(""), [cool, setCool] = useState(0);
  useEffect(() => { if (cool <= 0) return; const t = setTimeout(() => setCool(c => c - 1), 1000); return () => clearTimeout(t); }, [cool]);
  const session = `${BP}/api/session`; const q = to !== `${BP}/app` ? `?callbackUrl=${encodeURIComponent(to)}` : "";
  const run = async (f: () => Promise<void>) => { setBusy(true); setErr(""); setNote(""); try { await f(); } catch (e) { setErr(authErrorMessage(e)); } finally { setBusy(false); } };
  const need = () => { if (!config) { setErr("Sign-in isn't configured on this deployment yet. You can still use the app as a guest."); return false; } return true; };
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (mode === "forgot") { if (need()) void run(async () => { await resetPassword(config!, email); setStep("sent"); setCool(30); }); return; }
    if (step === "email") { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr("Enter a valid email address."); return; } setStep("details"); return; }
    if (!need()) return;
    if (mode === "login") void run(async () => { await signInWithEmail(config!, session, email, password); window.location.assign(to); });
    else void run(async () => { await createAccount(config!, email, password, name); setStep("verify"); setCool(30); });
  };
  const checkVerified = () => run(async () => { const ok = await finishVerifiedSignUp(config!, session); if (ok) window.location.assign(to); else setErr("We haven't seen the verification yet. Open the link in the email we sent, then try again."); });
  const title = mode === "forgot" ? (step === "sent" ? "Check your inbox" : "Can't log in?") : mode === "signup" ? (step === "verify" ? "Check your inbox to verify your email" : "Sign up to continue") : "Log in to continue";
  return <main className="trl">
    <div className="art l"><i className="p1" /><i className="p2" /><i className="p3" /><b className="f1" /><b className="f2" /></div>
    <div className="art r"><i className="p1" /><i className="p2" /><b className="mon" /><b className="rob" /></div>
    <div className="card" data-testid={`auth-${mode}`}>
      <Link href="/" className="lg" aria-label="TrelloIsDead home"><Mark size={32} /><span>TrelloIsDead</span></Link>
      <h1>{title}</h1>
      {step === "verify" ? <div data-testid="verify-step">
        <p className="nt">We sent a verification link to <b>{email}</b>. Open it to verify your address, then come back here. Can&apos;t find it? Check your spam folder.</p>
        <button className="go" disabled={busy} onClick={checkVerified}>{busy ? "Checking…" : "I've verified my email"}</button>
        <button type="button" className="pv" disabled={busy || cool > 0} onClick={() => run(async () => { await resendVerification(config!); setNote("Sent again."); setCool(30); })}>{cool > 0 ? `Resend email (${cool}s)` : "Resend email"}</button>
        <p className="lk"><a href="#" onClick={e => { e.preventDefault(); void abandonSignUp(config!).finally(() => { setStep("email"); setPassword(""); }); }}>Use a different email</a></p>
      </div> : step === "sent" ? <div data-testid="reset-sent">
        <p className="nt">If <b>{email}</b> has an account, we sent a link to reset your password. It can take a minute to arrive.</p>
        <button type="button" className="pv" disabled={busy || cool > 0} onClick={() => run(async () => { await resetPassword(config!, email); setCool(30); setNote("Sent again."); })}>{cool > 0 ? `Resend recovery link (${cool}s)` : "Resend recovery link"}</button>
        <p className="lk"><Link href={`/login${q}`}>Return to log in</Link></p>
      </div> : <form onSubmit={submit} noValidate>
        {mode === "forgot" && <p className="nt" style={{ marginTop: 0 }}>We&apos;ll send a recovery link to</p>}
        <label htmlFor="tr-email">Email{mode === "login" && <i>*</i>}</label>
        <input id="tr-email" type="email" required autoComplete="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} readOnly={step === "details"} autoFocus={step === "email"} />
        {step === "details" && mode === "signup" && <><label htmlFor="tr-name">Full name</label><input id="tr-name" required autoComplete="name" placeholder="Enter full name" value={name} onChange={e => setName(e.target.value)} autoFocus maxLength={100} /></>}
        {step === "details" && mode !== "forgot" && <><label htmlFor="tr-pass">Password</label><input id="tr-pass" type="password" required minLength={mode === "signup" ? 8 : 6} autoFocus={mode === "login"} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder={mode === "signup" ? "At least 8 characters" : "Enter password"} value={password} onChange={e => setPassword(e.target.value)} /></>}
        {step === "details" && <p className="lk" style={{ textAlign: "left", margin: "8px 0 0" }}><a href="#" onClick={e => { e.preventDefault(); setStep("email"); setPassword(""); }}>Change email</a></p>}
        {mode === "signup" && <p className="tos">By signing up, I accept the TrelloIsDead <Link href="/terms">Terms</Link> and acknowledge the <Link href="/privacy">Privacy Policy</Link>.</p>}
        <button className="go" disabled={busy || (step === "details" && mode === "signup" && (!name.trim() || password.length < 8))}>{busy ? "Working…" : mode === "forgot" ? "Send recovery link" : step === "email" ? "Continue" : mode === "signup" ? "Sign up" : "Log in"}</button>
      </form>}
      {err && <p role="alert" className="err">{err}</p>}{note && <p role="status" className="nt">{note}</p>}
      {mode !== "forgot" && step !== "verify" && <><p className="ow">Or continue with:</p>
        <button type="button" className="pv" disabled={busy} onClick={() => { if (need()) void run(async () => { await signInWithGoogle(config!, session); window.location.assign(to); }); }}>{G}Google</button></>}
      {step !== "verify" && step !== "sent" && <p className="lk">{mode === "signup" ? <Link href={`/login${q}`}>Already have an account? Log in</Link> : mode === "forgot" ? <Link href={`/login${q}`}>Return to log in</Link> : <><Link href={`/forgot-password${q}`}>Can&apos;t log in?</Link> &nbsp;•&nbsp; <Link href={`/signup${q}`}>Create an account</Link></>}</p>}
      <hr />
      <p className="oa"><Link href="/app">Continue without an account</Link>: your boards are saved as a guest and move into your account when you sign up.</p>
      <p className="oa pp"><Link href="/privacy">Privacy Policy</Link> &nbsp;•&nbsp; <Link href="/terms">Terms</Link></p>
      {!config && <p className="nt">Email and Google sign-in turn on once Firebase is configured for this deployment.</p>}
      {demo && mode === "login" && <button type="button" className="demo" onClick={async () => { const r = await fetch(`${BP}/api/session/demo`, { method: "POST" }); if (r.ok) window.location.assign(to); }}>Use the demo account</button>}
    </div>
  </main>;
}
