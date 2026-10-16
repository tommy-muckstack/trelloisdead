"use client";
// Browser helpers: Firebase email/password + Google popup, then trade the ID token for the
// shared httpOnly session cookie at `sessionUrl` (each app exposes POST {idToken} → 204).
import type { FirebaseClientConfig } from "./config";
let cached: Promise<import("firebase/auth").Auth> | null = null;
export function clientAuth(config: FirebaseClientConfig) {
  if (!cached) cached = (async () => {
    const { initializeApp, getApps } = await import("firebase/app");
    const { getAuth, inMemoryPersistence, setPersistence } = await import("firebase/auth");
    const app = getApps().find(a => a.name === "isdead") ?? initializeApp(config, "isdead");
    const auth = getAuth(app); await setPersistence(auth, inMemoryPersistence); // the server cookie is the source of truth
    return auth;
  })();
  return cached;
}
async function exchange(sessionUrl: string, idToken: string) {
  const r = await fetch(sessionUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken }), credentials: "same-origin" });
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? "Could not start a session");
}
export async function signInWithEmail(config: FirebaseClientConfig, sessionUrl: string, email: string, password: string) {
  const { signInWithEmailAndPassword } = await import("firebase/auth");
  const c = await signInWithEmailAndPassword(await clientAuth(config), email, password);
  await exchange(sessionUrl, await c.user.getIdToken());
}
export async function signUpWithEmail(config: FirebaseClientConfig, sessionUrl: string, email: string, password: string, name?: string) {
  const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } = await import("firebase/auth");
  const c = await createUserWithEmailAndPassword(await clientAuth(config), email, password);
  if (name) await updateProfile(c.user, { displayName: name });
  sendEmailVerification(c.user).catch(() => {});
  await exchange(sessionUrl, await c.user.getIdToken(true));
}
/** Sign-up step 1: create the Firebase account, set the display name and send the verification email.
 *  No session yet: the app is entered only after the address is verified (see finishVerifiedSignUp). */
export async function createAccount(config: FirebaseClientConfig, email: string, password: string, name: string, continueUrl?: string) {
  const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } = await import("firebase/auth");
  const c = await createUserWithEmailAndPassword(await clientAuth(config), email, password);
  if (name.trim()) await updateProfile(c.user, { displayName: name.trim() });
  await sendEmailVerification(c.user, continueUrl ? { url: continueUrl } : undefined);
}
export async function resendVerification(config: FirebaseClientConfig, continueUrl?: string) {
  const { sendEmailVerification } = await import("firebase/auth"); const u = (await clientAuth(config)).currentUser; if (!u) throw new Error("Start again: we lost track of your new account.");
  await sendEmailVerification(u, continueUrl ? { url: continueUrl } : undefined);
}
/** Sign-up step 2: once the link in the email was opened, trade a fresh token for the session. Returns false if not verified yet. */
export async function finishVerifiedSignUp(config: FirebaseClientConfig, sessionUrl: string): Promise<boolean> {
  const u = (await clientAuth(config)).currentUser; if (!u) throw new Error("Start again: we lost track of your new account.");
  await u.reload(); if (!u.emailVerified) return false;
  await exchange(sessionUrl, await u.getIdToken(true)); return true;
}
export async function abandonSignUp(config: FirebaseClientConfig) { const { signOut } = await import("firebase/auth"); await signOut(await clientAuth(config)); }
export async function signInWithGoogle(config: FirebaseClientConfig, sessionUrl: string) {
  const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
  const c = await signInWithPopup(await clientAuth(config), new GoogleAuthProvider());
  await exchange(sessionUrl, await c.user.getIdToken());
}
export async function resetPassword(config: FirebaseClientConfig, email: string) {
  const { sendPasswordResetEmail } = await import("firebase/auth");
  await sendPasswordResetEmail(await clientAuth(config), email);
}
/** Human-friendly message for a Firebase Auth error. */
export function authErrorMessage(e: any): string {
  const c = String(e?.code ?? "");
  if (/invalid-credential|wrong-password|user-not-found/.test(c)) return "Wrong email or password.";
  if (c.includes("email-already-in-use")) return "That email already has an account. Sign in instead.";
  if (c.includes("weak-password")) return "Use at least 6 characters for your password.";
  if (c.includes("invalid-email")) return "That email address doesn't look right.";
  if (c.includes("popup-closed")) return "Google sign-in was closed before it finished.";
  if (c.includes("too-many-requests")) return "Too many attempts. Try again in a few minutes.";
  if (c.includes("unauthorized-continue-uri") || c.includes("invalid-continue-uri")) return "Couldn't send the email from this address. Try again.";
  if (c.includes("network-request-failed")) return "Network problem. Check your connection and try again.";
  return e?.message ?? "Something went wrong.";
}
