# TrelloIsDead

Free, open-source kanban boards. Part of [IsDead](https://yourappisdead.com): open-source clones of paid SaaS. Served at `https://yourappisdead.com/trelloisdead`.

## What's in it

- **Boards home** (`/app`): sidebar, starred and recently viewed boards, Workspaces, invitations, closed boards. **Home** (`/app/home`) lists your cards by due date. **Templates** (`/app/templates`): 12 original templates.
- **Boards** (`/app/b/<id>`): lists and cards with drag and drop; list menu (copy, move to another board, sort, move all cards, watch, archive); header with star, visibility, filter (keyword, members, status, due, labels, activity, any/exact), members, Share and the board menu (about, activity, archived items, settings, background, labels, copy, JSON/CSV export, print, template, close).
- **Cards** (`?card=<id>`): members, named labels, start/due dates and reminders, several checklists, attachments (4 MB uploads and links), covers, location (OpenStreetMap), custom fields, Markdown description, comments with @mentions, activity.
- **Views** (`?view=`): Table, Calendar, Timeline, Dashboard, Map. **Power-Ups**: Voting, Card Aging, List Limits, Custom Fields, Card Numbers. **Automation**: rules, card buttons, board buttons.
- **Collaboration**: Workspaces with admins and members, board roles (admin, member, observer), invites by email or link, live updates (polling every 4 s), notifications (assignments, mentions, watched cards, due reminders), global search with operators.
- **Account**: profile, activity, cards, settings, light/dark theme, colour-blind label patterns, keyboard shortcuts (`?`).
- **Marketing and auth**: landing, pricing comparison, features, solutions, help, about, privacy, terms, templates; login (email + password, Google), sign-up with email verification, password reset; branded 404.

## How it works

- `lib/model.ts`: data model. One document per board (`board/<id>`), Workspace (`workspace/<id>`) and user (`user/<id>`), plus small board summaries (`bsum/<id>`) for tiles and access checks.
- `lib/actions.ts`: every board edit is an action. The browser applies it optimistically (`components/app/BoardProvider.tsx`); the server validates it (`normalizeAction`), checks permissions (`allowed`) and applies the same function to the stored board inside a transaction (`lib/store.ts` `mutateDoc`), so concurrent edits never overwrite each other. Automation rules run inside `applyAction`.
- `lib/server/data.ts`: users, Workspaces, access, invites, notifications and due reminders, search, uploads, guest adoption, migration of the old one-document-per-user format.
- Storage (`lib/store.ts`): Firestore when `FIREBASE_SERVICE_ACCOUNT_JSON` is set, otherwise JSON files under `.data/` (or `ISDEAD_DATA_DIR`). Uploads are chunked into the same store.
- Guests: anyone can use the app without signing up (IsDead rule). Signing in moves the guest's Workspaces and boards to the account.

## Run

```
npm ci
NODE_OPTIONS=--unhandled-rejections=warn npm run dev    # http://localhost:3000/trelloisdead (guests + demo accounts work without Firebase)
npm test && npm run typecheck
npm run build
```

Env (production): `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `AUTH_SECRET` (guest sessions), optional `DEMO_MODE=1`, `ISDEAD_DATA_DIR`.

## Tests

- Unit and server tests: `npm test` (the server tests run against a temp file store).
- End to end, with Playwright driving the real UI (start the dev server first): `BASE=http://localhost:3000/trelloisdead node scripts/e2e-<area>.mjs` for `home`, `workspaces`, `board-header`, `lists`, `card`, `views`, `search-notifications`, `account`, `auth-marketing`, `hygiene`. Two-person flows use the dev-only demo personas (`/api/session/demo?as=demo2`). `SHOTS=1` saves screenshots to `docs/qa/`.
- Against a protected Vercel preview: add `BYPASS=<protection bypass token>`; `scripts/e2e-preview-auth.mjs` checks real Firebase sign-up, verification, reset and login.
- `docs/PARITY_REPORT.md` maps every QA finding to its fix or documented exception.

## Gaps

- No email is sent for invitations or notifications (no email service); invite links cover sharing. Firebase sends sign-up verification and password-reset emails.
- Live updates use polling, not websockets. Uploads are capped at 4 MB (Vercel request limit).
- Not built: third-party Power-Ups and integrations, importing from Trello, card mirroring, stickers, Inbox and Planner.

Not affiliated with Atlassian or Trello. Apache-2.0.
