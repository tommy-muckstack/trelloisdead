import { firebaseClientConfig, firebaseConfigured } from "@/lib/isdead-auth/config";
import { afterAuth } from "@/lib/auth-pages";
import { TrLogin } from "@/components/TrLogin";
export const dynamic = "force-dynamic";
export const metadata = { title: "Can't log in? | TrelloIsDead" };
export default async function Forgot({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  return <TrLogin mode="forgot" config={firebaseConfigured() ? firebaseClientConfig() : null} demo={false} to={afterAuth(callbackUrl)} />;
}
