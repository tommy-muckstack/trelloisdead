// Analytics taxonomy for the shared IsDead PostHog project 666931 (contract: yourappisdead/ANALYTICS.md, see docs/ANALYTICS.md).
// Super properties: product (this app's slug), surface ("landing" = logged-out marketing pages, "app" = the working product
// and anything it publishes), platform ("web"). Page views are PostHog's built-in $pageview.
// Events are `app_<object>_<action>` (or `landing_<object>_<action>` for marketing CTAs); the product name lives in
// `product`, never in an event name. Never send user content (titles, URLs, emails, text) as properties.
export const APP = "trelloisdead" as const;
export type Surface = "landing" | "app";
export const EVENTS = {
  app_signed_up: "app_signed_up",       // method ("password" | "google")
  app_signed_in: "app_signed_in",       // method ("password" | "google")
  app_signed_out: "app_signed_out",
  // ---- boards & workspaces ----
  app_board_created: "app_board_created",         // template (bool), visibility ("private" | "workspace" | "public")
  app_workspace_created: "app_workspace_created", // workspace_type (preset id from the picker)
  app_shared: "app_shared",                       // object ("board"), method ("invite" | "link"), role (invite only)
  // ---- board content (fired from BoardProvider.dispatch, so drag-drop, menus, shortcuts and automation all count) ----
  app_list_created: "app_list_created",           // copy (bool)
  app_card_created: "app_card_created",           // origin ("add" | "copy" | "checklist_item" | "template"); not "source", a legacy super-property key
  app_card_moved: "app_card_moved",               // only when the card changes list
  app_card_completed: "app_card_completed",
  app_card_deleted: "app_card_deleted",
  app_comment_added: "app_comment_added",
  app_checklist_added: "app_checklist_added",     // copied (bool)
  landing_cta_clicked: "landing_cta_clicked", // target ("signup" | "app" | "pricing" | ...)
} as const;
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
export const EVENT_PREFIXES = ["app_", "landing_"] as const;
/** Super properties every event carries (yourappisdead/ANALYTICS.md §1). */
export const superProps = (surface: Surface) => ({ product: APP, surface, platform: "web" as const });
/** Super properties older IsDead taxonomies persisted in the shared yourappisdead.com cookie. Unregistered at boot. */
export const LEGACY_PROPS = ["app", "app_family", "base_path", "suite_id", "app_id", "schema_version", "source", "site_id", "environment"] as const;
