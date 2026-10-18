# Analytics (PostHog)

One PostHog project (US cloud, project **666931**) collects the hub and every IsDead sub-app. The contract is the hub's
`yourappisdead/ANALYTICS.md`; this file is how TrelloIsDead follows it.

## Setup
- `NEXT_PUBLIC_POSTHOG_KEY` = the project's publishable token; `NEXT_PUBLIC_POSTHOG_HOST=https://us.posthog.com` (already set on Vercel). No key → analytics is a no-op.
- Reverse proxy through our own origin: `/trelloisdead/ingest/*` → `us.i.posthog.com` (rewrites in `next.config.mjs`, with `skipTrailingSlashRedirect: true`).
- `<Analytics />` is mounted once in `app/layout.tsx`: it boots the client and sends `$pageview` per route change. Autocapture and session replay are off.
- posthog-js drops automated browsers. In dev, `localStorage.isdead_ph_debug = "1"` turns on verbose logs and lets Playwright capture (production keeps the bot filter).

## Super properties
| property | value | meaning |
| --- | --- | --- |
| `product` | `trelloisdead` | filter by this |
| `surface` | `landing` \| `app` | `landing` = marketing pages, pricing, login/signup; `app` = everything under `/app` (boards, workspaces, join links, public boards) |
| `platform` | `web` | |
| `env` | `production` \| `development` | |
| `account_type` | `firebase` \| `guest` \| `demo` | registered by `AppProvider` |

## Identity
Signed-in Firebase users are identified by uid (`AppProvider`). Guests and the demo account are never identified; only
`account_type` is registered. Log out sends `app_signed_out`, then `resetIdentity()` (which re-registers the super properties).

## Events
| event | properties | fired from |
| --- | --- | --- |
| `app_signed_up` | `method`: password | `components/TrLogin.tsx` (`trackNow`, before the redirect) |
| `app_signed_in` | `method`: password \| google | `components/TrLogin.tsx` |
| `app_signed_out` | | `components/app/Account.tsx` |
| `app_board_created` | `template` (bool), `visibility` | `CreateBoard.tsx`, `TemplatesPage.tsx` |
| `app_workspace_created` | `workspace_type` (picker preset) | `Header.tsx` |
| `app_shared` | `object`: board, `method`: invite \| link, `role` (invite) | `components/board/Share.tsx` |
| `app_list_created` | `copy` (bool) | board actions |
| `app_card_created` | `origin`: add \| copy \| template \| checklist_item | board actions |
| `app_card_moved` | (only when the card changes list) | board actions |
| `app_card_completed` | | board actions |
| `app_card_deleted` | | board actions |
| `app_comment_added` | | board actions |
| `app_checklist_added` | `copied` (bool) | board actions |

"Board actions" = `lib/analytics/boardEvents.ts`, called from `BoardProvider.dispatch`, so drag and drop, menus, keyboard
shortcuts and automation buttons all count.

Rules: event names are defined only in `lib/analytics/taxonomy.ts` (the unit test enforces `app_` / `landing_` prefixes and no
product name). Properties are kinds, counts, ids and booleans: never card/list/board titles, comments, emails or URLs. Don't use
legacy super-property keys (`source`, `app`, `app_id`, ...) as event properties: they're unregistered at boot.
