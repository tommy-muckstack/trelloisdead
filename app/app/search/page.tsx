import { SearchPage } from "@/components/app/Search";
export const metadata = { title: "Search | TrelloIsDead" };
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) { return <SearchPage initial={(await searchParams).q ?? ""} />; }
