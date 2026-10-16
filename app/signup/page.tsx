import { demoEnabled } from "@/lib/session";
import { firebaseClientConfig, firebaseConfigured } from "@/lib/isdead-auth/config";
import { afterAuth } from "@/lib/auth-pages";
import { TrLogin } from "@/components/TrLogin";
export const dynamic = "force-dynamic";
export const metadata = { title: "Sign up | TrelloIsDead" };
export default async function Signup({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; email?: string }> }) {
  const { callbackUrl, email } = await searchParams;
  return <TrLogin mode="signup" email={typeof email === "string" ? email.slice(0, 200) : ""} config={firebaseConfigured() ? firebaseClientConfig() : null} demo={demoEnabled()} to={afterAuth(callbackUrl)} />;
}
