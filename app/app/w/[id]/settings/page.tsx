import { WorkspaceSettings } from "@/components/app/WorkspacePage";
export const metadata = { title: "Workspace settings | TrelloIsDead" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <WorkspaceSettings id={(await params).id} />; }
