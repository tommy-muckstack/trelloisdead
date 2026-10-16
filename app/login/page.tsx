import { redirect } from "next/navigation";
import { demoEnabled } from "@/lib/session";
import { firebaseClientConfig, firebaseConfigured } from "@/lib/isdead-auth/config";
import { afterAuth } from "@/lib/auth-pages";
import { TrLogin } from "@/components/TrLogin";
export const dynamic = "force-dynamic";
export const metadata = { title: "Log in | TrelloIsDead" };
export default async function Login({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; mode?: string }> }) {
  const { callbackUrl, mode } = await searchParams;
  if (mode === "signup") redirect(`/signup${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`);
  return <TrLogin mode="login" config={firebaseConfigured() ? firebaseClientConfig() : null} demo={demoEnabled()} to={afterAuth(callbackUrl)} />;
}
