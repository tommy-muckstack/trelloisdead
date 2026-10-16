import { redirect } from "next/navigation";
// Sign-up lives on the login page for now (mode=signup); keeps /signup links working.
export default async function Signup({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) { const { callbackUrl } = await searchParams; redirect(`/login?mode=signup${callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`); }
