import { BoardView } from "@/components/BoardView";
export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) { return <BoardView id={(await params).id} />; }
