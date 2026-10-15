import { getDoc } from "@/lib/store";
import { demoState, welcomeState, type State } from "@/lib/board";
/** A user's saved boards, or a starter set (the demo account gets the sample "Launch plan" boards). */
export async function loadState(userId: string, demo: boolean): Promise<State> {
  return (await getDoc<State>("boards", userId)) ?? (demo ? demoState() : welcomeState());
}
