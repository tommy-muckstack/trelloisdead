# TrelloIsDead

Free, open-source kanban boards. Part of [IsDead](https://yourappisdead.com): open-source clones of paid SaaS. Served at `https://yourappisdead.com/trelloisdead`.

- **Homepage** (`/`): mirrors Trello's homepage structure (email sign-up hero, "101" steps, feature rows, stats, price comparison at `#pricing`) with original copy and art.
- **Login** (`/login`): shared IsDead Firebase auth (email/password + Google); one demo account in demo mode.
- **App** (`/app`, `/app/b/<id>`): boards with 6 backgrounds; lists and cards; drag and drop for cards and lists (plus a "Move to list" select for touch screens); card labels, due dates (overdue/soon badges), descriptions, checklists with progress; copy, archive/restore, delete; filter by text and label. Boards save to your account via `/api/state`, so every device sees the same boards.
- All board logic is pure functions in `lib/board.ts` (tested in `tests/unit`).

Design: theme `trello` in `vendor/isdead-design` (canonical `/workspace/isdead-design`); font Manrope (OFL) as a lookalike for Trello's proprietary faces.

## Run

```
npm ci
npm run dev            # http://localhost:3000/trelloisdead  (demo account in dev)
npm test && npm run typecheck
npm run build && npm run shots   # production smoke test + screenshots
```

Env (production): `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `AUTH_SECRET`, optional `DEMO_MODE=1`, `ISDEAD_DATA_DIR`.

## Gaps

- **Storage:** `lib/store.ts` writes JSON files; Vercel's disk is ephemeral, so production needs the Firestore swap. The whole account is saved as one document, last write wins (two devices editing at once can overwrite each other).
- **Not built:** shared boards and members, comments and activity, attachments, card covers, custom labels, automation, calendar/timeline views, real-time sync, undo.
- Sign-in has not been tested against the live Firebase project (keys pending).

Not affiliated with Atlassian or Trello. Apache-2.0.
