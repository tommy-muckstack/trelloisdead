// Which board actions are analytics events. Pure, so it is unit-tested; called from BoardProvider.dispatch.
import type { ActionBody } from "@/lib/actions";
import type { Board } from "@/lib/model";
import { EVENTS, type EventName } from "./taxonomy";

/** The analytics event (if any) for a board action. Kinds and booleans only, never titles or text. */
export function actionEvent(body: ActionBody, board: Board): [EventName, Record<string, string | boolean>] | null {
  switch (body.t) {
    case "list.add": return [EVENTS.app_list_created, { copy: false }];
    case "list.copy": return [EVENTS.app_list_created, { copy: true }];
    case "card.add": return [EVENTS.app_card_created, { origin: "add" }];
    case "card.copy": return [EVENTS.app_card_created, { origin: body.template ? "template" : "copy" }];
    case "item.toCard": return [EVENTS.app_card_created, { origin: "checklist_item" }];
    case "card.move": { const from = board.lists.find(l => l.cards.some(c => c.id === body.cardId)); return from && from.id !== body.listId ? [EVENTS.app_card_moved, {}] : null; }
    case "card.patch": return body.patch.dueComplete === true ? [EVENTS.app_card_completed, {}] : null;
    case "card.delete": return [EVENTS.app_card_deleted, {}];
    case "comment.add": return [EVENTS.app_comment_added, {}];
    case "checklist.add": return [EVENTS.app_checklist_added, { copied: !!body.copyFrom }];
    default: return null;
  }
}
