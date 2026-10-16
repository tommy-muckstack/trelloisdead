import { notFound } from "next/navigation";
import { UserPage } from "@/components/app/Account";
const TABS = ["profile", "activity", "cards", "settings"];
export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }) { const t = (await params).tab; return { title: `${t[0]!.toUpperCase()}${t.slice(1)} | TrelloIsDead` }; }
export default async function Page({ params }: { params: Promise<{ tab: string }> }) { const { tab } = await params; if (!TABS.includes(tab)) notFound(); return <UserPage tab={tab} />; }
