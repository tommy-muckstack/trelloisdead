import { WorkspaceMembers } from "@/components/app/WorkspacePage";
export const metadata = { title: "Workspace members | TrelloIsDead" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <WorkspaceMembers id={(await params).id} />; }
