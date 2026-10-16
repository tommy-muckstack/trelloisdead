# TrelloIsDead parity report

Source: hands-on QA pass of 2026-10-16 (31 findings). Each row says what Trello does, what TrelloIsDead now does, and the PR that closed it.

**How Trello behaviour was checked.** Rows tagged [obs] were observed on trello.com's public pages. Rows tagged [gk] (signed-in app behaviour) were checked against Trello's public help center instead of a throwaway Trello account: keyboard shortcuts ([support.atlassian.com/trello/docs/keyboard-shortcuts-in-trello](https://support.atlassian.com/trello/docs/keyboard-shortcuts-in-trello/)), the board filter ([filtering-for-cards-on-a-board](https://support.atlassian.com/trello/docs/filtering-for-cards-on-a-board/)), dates and reminders ([adding-dates-to-cards](https://support.atlassian.com/trello/docs/adding-dates-to-cards/)) and completion ([mark-a-card-as-complete](https://support.atlassian.com/trello/docs/mark-a-card-as-complete/)). No Trello account was created.

**Verification.** Every fixed row has a Playwright script under `scripts/` that drives the real UI with mouse and keyboard events (`BASE=http://localhost:3019/trelloisdead node scripts/e2e-<area>.mjs`), plus unit tests in `tests/unit`. Two-person flows use the dev-only demo personas (`/api/session/demo?as=demo2`).

| # | Area | Status | PR | Notes |
|---|------|--------|----|-------|
| 1 | Landing nav and footer | open | | |
| 2 | Branding | open | | |
| 3 | Pricing | open | | |
| 4 | Login | open | | |
| 5 | Signup | open | | |
| 6 | Forgot password | open | | |
| 7 | 404 | open | | |
| 8 | Signed-out /app | open | | |
| 9 | Boards home | fixed | fix/boards-home | Sidebar (Boards, Templates, Home, Workspaces with Boards/Members/Settings), starred and recently viewed boards, every Workspace's boards, Guest Workspaces (boards shared with you), invitations, closed boards with reopen and delete. Home page lists your cards by due date. |
| 10 | Create board | fixed | fix/boards-home | Popover from the header Create menu and the "Create new board" tile: preview, photo and colour backgrounds, required title, Workspace, visibility, "Start with a template". Board delete moved behind Close → Delete with a confirmation. |
| 11 | Templates | fixed | fix/boards-home | Gallery of 12 original templates in Trello's categories with search, preview and "Use template" (creates a real board). Boards marked as templates show under "Your Workspace templates". |
| 12 | Board header | fixed | fix/board-header | Editable title, star, visibility (Private / Workspace / Public, admins only), Filter with a count and Clear all, member avatars with role popovers, Share, and the ⋯ menu. View switcher, Power-Ups and Automation buttons arrive with fix/views-automation. |
| 13 | Lists | fixed | fix/lists | The ⋯ button opens Trello's list menu instead of archiving: Add card (at the top), Copy list, Move list (position, or another board), Move all cards in this list, Sort by (date created, name, due date, votes with the Voting Power-Up), Watch, Archive this list, Archive all cards (with confirmation). |
| 14 | Cards add | fixed | fix/lists | Kept: Enter adds and keeps the composer open, Shift+Enter is a newline, Escape or clicking away closes (a typed title is saved). New: add from the list menu inserts at the top. |
| 15 | Card detail | open | | |
| 16 | Card badges | open | | |
| 17 | Drag and drop | fixed | fix/lists | Kept and re-verified with real mouse drags: cards between lists, lists by their header; order survives reload. On touch screens cards move from the card's Move action. |
| 18 | Filter | fixed | fix/board-header | Trello's six categories: keyword (words match any, "quotes" exact, * all), members (none, me, each member), card status, due date (none, overdue, next day/week/month), labels (none, each label) and activity, with Any match / Exact match. |
| 19 | Board background | fixed | fix/boards-home | 16 Unsplash photos (self-hosted, credited to the photographer, Unsplash License), 9 gradients, 9 colours, and custom image upload (PNG/JPEG/GIF/WebP up to 4 MB). |
| 20 | Archive | fixed | fix/board-header | Board menu → Archived items: search, switch between cards and lists, restore, and delete cards forever with a confirmation. Trello can't delete lists either; they restore. |
| 21 | Power-Ups / Automation / Activity | open | | |
| 22 | Views | open | | |
| 23 | Workspaces / members / settings / invite | fixed | fix/boards-home | Multiple Workspaces; members with admin/member roles; invite by email (existing accounts join at once, others see the invitation when they sign up with that address); invite links; settings (name, type, short name, website, description, visibility); leave and delete. Exception: no invitation email is sent, because the project has no email service; the invite link covers that. |
| 24 | Global search | open | | |
| 25 | Notifications | open | | |
| 26 | Profile menu / settings | open | | |
| 27 | Keyboard shortcuts | open | | |
| 28 | Persistence | open | | |
| 29 | Sign out / in | open | | |
| 30 | Console errors | open | | |
| 31 | Mobile 390px | open | | |
