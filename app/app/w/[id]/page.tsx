import { WorkspaceBoards } from "@/components/app/WorkspacePage";
export const metadata = { title: "Workspace boards | TrelloIsDead" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <WorkspaceBoards id={(await params).id} />; }
