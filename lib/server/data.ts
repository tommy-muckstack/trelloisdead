// Server-side data access. Collections (lib/store.ts): user/<id>, workspace/<id>, board/<id>, bsum/<id> (small board
// summary for tiles and access checks), email/<address> -> user id, invite/<address> (pending invites for people
// without an account yet), token/<token> (invite links), filemeta/<id> + blob_files (uploads), boards/<id> (legacy, migrated).
import crypto from "node:crypto";
import { delDoc, getDoc, mutateDoc, putDoc } from "@/lib/store";
/** Unguessable ids for invite links and uploaded files. */
const secret = () => crypto.randomBytes(24).toString("base64url");
import type { SessionUser } from "@/lib/session";
import { applyAction, allowed, normalizeAction, SERVER_ONLY, type Action, type ActionBody } from "@/lib/actions";
import { mentionsIn } from "@/lib/markdown";
import {
  LIMITS, colorFor, findCard, initialsOf, isId, memberOf, mkBoard, mkCard, mkLabels, mkList, now, summary, uid, usernameFrom, REMINDERS, dateToken,
  type Board, type BoardSummary, type Notification, type Person, type Role, type Scheduled, type UserDoc, type Visibility, type Workspace, type WsMember,
} from "@/lib/model";
import { buildFromTemplate, copyBoard, TEMPLATES } from "@/lib/templates";
import { demoState, type State as LegacyState, type Board as LegacyBoard } from "@/lib/board";

export type BSum = BoardSummary & { memberIds: string[]; roles: Record<string, Role>; ownerId: string };
export class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }
const emailKey = (e: string) => e.trim().toLowerCase();

export const personOf = (u: Pick<UserDoc, "id" | "name" | "username" | "email" | "initials" | "color" | "avatar">): Person => ({ id: u.id, name: u.name, username: u.username, email: u.email, initials: u.initials, color: u.color, avatar: u.avatar ?? null });
const toBSum = (b: Board): BSum => ({ ...summary(b, null), memberIds: b.members.map(m => m.id), roles: Object.fromEntries(b.members.map(m => [m.id, m.role])), ownerId: b.ownerId });
const sumFor = (s: BSum, userId: string): BoardSummary => ({ id: s.id, title: s.title, bg: s.bg, workspaceId: s.workspaceId, visibility: s.visibility, closed: s.closed, isTemplate: s.isTemplate, updatedAt: s.updatedAt, role: s.roles[userId] ?? null });

// ---------------------------------------------------------------- boards (raw)
export const getBoard = (id: string) => (isId(id) ? getDoc<Board>("board", id) : Promise.resolve(null));
async function saveNewBoard(b: Board) { await putDoc("board", b.id, b); await putDoc("bsum", b.id, toBSum(b)); }
async function addBoardToWorkspace(wsId: string, boardId: string) { await mutateDoc<Workspace>("workspace", wsId, w => (w && !w.boards.includes(boardId) ? { ...w, boards: [boardId, ...w.boards] } : undefined)); }
async function removeBoardFromWorkspace(wsId: string, boardId: string) { await mutateDoc<Workspace>("workspace", wsId, w => (w && w.boards.includes(boardId) ? { ...w, boards: w.boards.filter(x => x !== boardId) } : undefined)); }
async function indexBoard(userId: string, boardId: string, on: boolean) {
  await mutateDoc<UserDoc>("user", userId, u => { if (!u) return undefined; const has = u.boards.includes(boardId); if (has === on) return undefined; return { ...u, boards: on ? [boardId, ...u.boards] : u.boards.filter(x => x !== boardId), starred: on ? u.starred : u.starred.filter(x => x !== boardId) }; });
}

// ---------------------------------------------------------------- users
function newUserDoc(s: SessionUser, wsId: string): UserDoc {
  const name = s.guest ? "Guest" : s.name || usernameFrom(s.email);
  return { id: s.id, name, username: s.guest ? "guest" : usernameFrom(s.email || s.name), email: s.email, initials: initialsOf(name), color: colorFor(s.id), avatar: null, bio: "",
    workspaces: [wsId], boards: [], starred: [], recent: [], settings: { theme: "light", shortcuts: true, colorBlind: false, desktop: false }, notifications: [], scheduled: [], guest: s.guest, createdAt: now() };
}
function newWorkspace(id: string, name: string, owner: Person): Workspace {
  return { id, name: name.slice(0, 100), short: name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 30) + id.slice(-4), desc: "", website: "", type: "", ownerId: owner.id, members: [{ ...owner, role: "admin" }], invites: [], boards: [], inviteToken: "", visibility: "private", createdAt: now() };
}
function convertLegacy(lb: LegacyBoard, ws: string, owner: Person): Board {
  const b = mkBoard({ id: lb.id, title: lb.title, bg: lb.bg, workspaceId: ws, owner, at: lb.createdAt });
  const colors = ["green", "yellow", "orange", "red", "purple", "blue"]; b.labels = mkLabels(b.id, colors.map(color => ({ color, name: "" })));
  const lab = (l: string) => b.labels[colors.indexOf(l)]?.id; let seq = 0;
  b.lists = lb.lists.map(l => ({ ...mkList(l.id, l.title, l.cards.map(c => mkCard(c.id, ++seq, c.title, c.createdAt, {
    desc: c.desc, labels: c.labels.map(lab).filter((x): x is string => !!x), due: c.due ? `${c.due}T17:00:00.000Z` : null, archived: c.archived,
    checklists: c.checklist.length ? [{ id: c.id + "k0", title: "Checklist", items: c.checklist.map(i => ({ id: i.id, text: i.text, done: i.done, due: null, member: null })) }] : [],
  }))), archived: l.archived }));
  b.seq = seq; return b;
}
function welcomeBoard(id: string, ws: string, owner: Person): Board {
  const b = mkBoard({ id, title: "My first board", bg: "ocean", workspaceId: ws, owner }); const at = b.createdAt;
  b.lists = [mkList(id + "l0", "To do", [mkCard(id + "c0", 1, "Open a card to add a description, checklist and due date", at), mkCard(id + "c1", 2, "Drag cards between lists", at)]),
    mkList(id + "l1", "Doing", [mkCard(id + "c2", 3, "Star this board to find it quickly", at)]), mkList(id + "l2", "Done", [mkCard(id + "c3", 4, "Create a board", at, { dueComplete: false })])];
  b.seq = 4; return b;
}

/** The signed-in user's doc, created on first visit (default workspace + first board, or their pre-workspace boards migrated). */
export async function ensureUser(s: SessionUser): Promise<UserDoc> {
  const existing = await getDoc<UserDoc>("user", s.id);
  if (existing) {
    if (!s.guest && existing.email !== s.email && s.email) { await putDoc("email", emailKey(s.email), { id: s.id }); return (await mutateDoc<UserDoc>("user", s.id, u => (u ? { ...u, email: s.email, guest: false } : undefined)))!; }
    return existing;
  }
  const wsId = uid("w"); let created = false;
  const u = (await mutateDoc<UserDoc>("user", s.id, cur => { if (cur) return undefined; created = true; return newUserDoc(s, wsId); }))!;
  if (!created) return u;
  const me = personOf(u);
  const ws = newWorkspace(wsId, s.guest ? "Guest Workspace" : `${me.name.split(" ")[0]}'s Workspace`, me);
  const legacy = await getDoc<LegacyState>("boards", s.id);
  const boards = legacy?.boards?.length ? legacy.boards.map(b => convertLegacy(b, wsId, me)) : s.demo ? demoState().boards.map(b => convertLegacy(b, wsId, me)) : [welcomeBoard(uid("b"), wsId, me)];
  for (const b of boards) await saveNewBoard(b);
  ws.boards = boards.map(b => b.id); await putDoc("workspace", wsId, ws);
  const done = await mutateDoc<UserDoc>("user", s.id, x => (x ? { ...x, boards: [...boards.map(b => b.id), ...x.boards] } : undefined));
  if (legacy) await delDoc("boards", s.id);
  if (!s.guest && s.email) { await putDoc("email", emailKey(s.email), { id: s.id }); await acceptPendingInvites(done!); }
  return (await getDoc<UserDoc>("user", s.id)) ?? done!;
}

const REMINDER_LABEL = (m: number) => REMINDERS.find(r => r.v === m)?.label ?? "";
/** Move due reminders whose time has come into the notification list. */
/** Move due reminders into notifications. `stale` keys are dropped silently (card archived or deleted, board gone, no longer a member or watcher). */
function materialize(u: UserDoc, stale: Set<string>): UserDoc | undefined {
  const t = Date.now(); const all = u.scheduled.filter(s => new Date(s.fireAt).getTime() <= t); if (!all.length) return undefined;
  const due = all.filter(s => !stale.has(s.key));
  const fresh: Notification[] = due.map(s => ({ id: uid("n"), at: s.fireAt, read: false, kind: "due", text: s.text, by: "", byName: "Reminder", boardId: s.boardId, cardId: s.cardId, link: `/app/b/${s.boardId}?card=${s.cardId}` }));
  return { ...u, scheduled: u.scheduled.filter(s => !all.includes(s)), notifications: [...fresh, ...u.notifications].slice(0, LIMITS.notifications) };
}
export type MePayload = { user: UserDoc; workspaces: Workspace[]; boards: BoardSummary[]; invites: PendingInvite[] };
export type PendingInvite = { kind: "workspace" | "board"; id: string; name: string; role: Role; byName: string; at: string };
export async function loadMe(s: SessionUser): Promise<MePayload> {
  let user = await ensureUser(s);
  const firing = user.scheduled.filter(x => new Date(x.fireAt).getTime() <= Date.now());
  if (firing.length) {
    const stale = new Set<string>();
    for (const x of firing) { const b = await getBoard(x.boardId); const hit = b ? findCard(b, x.cardId) : null; const c = hit?.card;
      if (!b || !hit || !c || c.archived || hit.list.archived || c.dueComplete || !c.due || !memberOf(b, user.id) || !(c.members.includes(user.id) || c.watchers.includes(user.id))) stale.add(x.key); }
    user = (await mutateDoc<UserDoc>("user", user.id, u => (u ? materialize(u, stale) : undefined))) ?? user;
  }
  const workspaces = (await Promise.all(user.workspaces.map(id => getDoc<Workspace>("workspace", id)))).filter((w): w is Workspace => !!w && w.members.some(m => m.id === user.id));
  const ids = new Set<string>(user.boards); for (const w of workspaces) for (const b of w.boards) ids.add(b);
  const sums = (await Promise.all([...ids].map(id => getDoc<BSum>("bsum", id)))).filter((x): x is BSum => !!x);
  const wsIds = new Set(workspaces.map(w => w.id));
  const boards = sums.filter(b => b.memberIds.includes(user.id) || (b.visibility !== "private" && wsIds.has(b.workspaceId))).map(b => sumFor(b, user.id)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const invites = user.guest || !user.email ? [] : ((await getDoc<{ items: PendingInvite[] }>("invite", emailKey(user.email)))?.items ?? []);
  return { user, workspaces, boards, invites };
}

export type UserPatch = Partial<Pick<UserDoc, "name" | "username" | "bio" | "avatar" | "color">> & { settings?: Partial<UserDoc["settings"]>; star?: { boardId: string; on: boolean }; viewed?: string; readAll?: boolean; read?: { id: string; on: boolean } };
export async function patchUser(s: SessionUser, p: UserPatch): Promise<UserDoc> {
  let profileChanged = false;
  const u = await mutateDoc<UserDoc>("user", s.id, cur => {
    if (!cur) return undefined; const n = { ...cur };
    if (typeof p.name === "string" && p.name.trim()) { n.name = p.name.trim().slice(0, 100); n.initials = initialsOf(n.name); }
    if (typeof p.username === "string") { const un = p.username.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24); if (un.length >= 2) n.username = un; }
    if (typeof p.bio === "string") n.bio = p.bio.slice(0, 1000);
    if (p.avatar === null || (typeof p.avatar === "string" && /^\/[\w/.-]*api\/files\/[A-Za-z0-9_-]+$/.test(p.avatar))) n.avatar = p.avatar;
    if (typeof p.color === "string" && /^#[0-9A-Fa-f]{6}$/.test(p.color)) n.color = p.color;
    profileChanged = n.name !== cur.name || n.username !== cur.username || n.avatar !== cur.avatar || n.color !== cur.color;
    if (p.settings) n.settings = { ...cur.settings, ...Object.fromEntries(Object.entries(p.settings).filter(([k, v]) => (k === "theme" ? ["light", "dark", "system"].includes(v as string) : typeof v === "boolean"))) };
    if (p.star && isId(p.star.boardId)) n.starred = p.star.on ? [p.star.boardId, ...cur.starred.filter(x => x !== p.star!.boardId)].slice(0, 100) : cur.starred.filter(x => x !== p.star!.boardId);
    if (p.viewed && isId(p.viewed)) n.recent = [{ id: p.viewed, at: now() }, ...cur.recent.filter(r => r.id !== p.viewed)].slice(0, 12);
    if (p.readAll) n.notifications = cur.notifications.map(x => ({ ...x, read: true }));
    if (p.read && isId(p.read.id)) n.notifications = cur.notifications.map(x => (x.id === p.read!.id ? { ...x, read: p.read!.on } : x));
    return n;
  });
  if (!u) throw new HttpError(404, "No such user");
  if (profileChanged) { // keep the copies of this person on boards and workspaces fresh
    const me = personOf(u);
    for (const id of u.boards) await mutateDoc<Board>("board", id, b => (b && memberOf(b, me.id) ? { ...applyAction(b, { id: uid("x"), at: now(), by: me.id, byName: me.name, t: "member.profile", person: me }), version: b.version + 1 } : undefined));
    for (const id of u.workspaces) await mutateDoc<Workspace>("workspace", id, w => (w && w.members.some(m => m.id === me.id) ? { ...w, members: w.members.map(m => (m.id === me.id ? { ...me, role: m.role } : m)) } : undefined));
  }
  return u;
}

async function notify(userId: string, n: Omit<Notification, "id" | "at" | "read">) {
  await mutateDoc<UserDoc>("user", userId, u => (u ? { ...u, notifications: [{ ...n, id: uid("n"), at: now(), read: false }, ...u.notifications].slice(0, LIMITS.notifications) } : undefined));
}

// ---------------------------------------------------------------- access
export type Access = { board: Board; role: Role | null; via: "member" | "workspace" | "public" };
export async function access(userId: string, boardId: string): Promise<Access | null> {
  const board = await getBoard(boardId); if (!board) return null;
  const m = memberOf(board, userId); if (m) return { board, role: m.role, via: "member" };
  if (board.visibility === "workspace") { const ws = await getDoc<Workspace>("workspace", board.workspaceId); if (ws?.members.some(x => x.id === userId)) return { board, role: null, via: "workspace" }; }
  if (board.visibility === "public") return { board, role: null, via: "public" };
  return null;
}
async function wsAdmin(userId: string, wsId: string) { const w = await getDoc<Workspace>("workspace", wsId); if (!w) throw new HttpError(404, "No such Workspace"); const m = w.members.find(x => x.id === userId); if (!m) throw new HttpError(403, "You're not a member of this Workspace"); return { ws: w, admin: m.role === "admin" }; }

// ---------------------------------------------------------------- board actions
/** Apply a batch of client actions to a board. Returns the stored board. */
export async function applyActions(s: SessionUser, boardId: string, raws: unknown[]): Promise<Board> {
  const me = await ensureUser(s); let before: Board | null = null; const applied: Action[] = []; let rejected = 0;
  const after = await mutateDoc<Board>("board", boardId, b => {
    if (!b) return undefined; before = b; let cur = b; applied.length = 0; rejected = 0;
    for (const raw of raws.slice(0, 100)) {
      const body = normalizeAction(raw); if (!body || SERVER_ONLY.includes(body.t)) { rejected++; continue; }
      const id = isId((raw as any)?.id) ? (raw as any).id : uid("a");
      const a = { ...body, id, at: now(), by: me.id, byName: me.name } as Action;
      if (body.t === "board.patch" && body.patch.workspaceId && body.patch.workspaceId !== b.workspaceId) { rejected++; continue; } // workspace moves go through moveBoard()
      if (!allowed(cur, a)) { rejected++; continue; }
      cur = applyAction(cur, a); applied.push(a);
    }
    return applied.length ? { ...cur, version: b.version + 1 } : undefined;
  });
  if (!after || !before) throw new HttpError(404, "This board doesn't exist, or you don't have access to it.");
  if (!applied.length) { if (!memberOf(after, me.id)) throw new HttpError(403, "You need to be a board member to edit this board."); return after; }
  await afterSave(before, after, applied, me);
  return after;
}

/** Side effects of a board change: summary doc, member indexes, notifications and due reminders. */
async function afterSave(before: Board, after: Board, applied: Action[], me: UserDoc) {
  await putDoc("bsum", after.id, toBSum(after));
  const was = new Set(before.members.map(m => m.id)), is = new Set(after.members.map(m => m.id));
  for (const id of is) if (!was.has(id)) await indexBoard(id, after.id, true);
  for (const id of was) if (!is.has(id)) await indexBoard(id, after.id, false);
  const link = (cardId: string) => `/app/b/${after.id}?card=${cardId}`;
  for (const a of applied) {
    if (a.t === "card.member" && a.on && a.userId !== me.id) { const c = findCard(after, a.cardId)?.card; if (c) await notify(a.userId, { kind: "assigned", text: `added you to the card ${c.title} on ${after.title}`, by: me.id, byName: me.name, boardId: after.id, cardId: c.id, link: link(c.id) }); }
    if (a.t === "comment.add") {
      const c = findCard(after, a.cardId)?.card; if (!c) continue;
      const named = new Set(mentionsIn(a.text)); const all = named.has("card") || named.has("board");
      const targets = after.members.filter(m => m.id !== me.id && (named.has(m.username.toLowerCase()) || (named.has("card") && c.members.includes(m.id)) || named.has("board")));
      for (const m of targets) await notify(m.id, { kind: "mention", text: `mentioned you on ${c.title}: ${a.text.slice(0, 140)}`, by: me.id, byName: me.name, boardId: after.id, cardId: c.id, link: link(c.id) });
      const told = new Set(targets.map(m => m.id)); void all;
      for (const w of c.watchers) if (w !== me.id && !told.has(w) && memberOf(after, w)) await notify(w, { kind: "comment", text: `commented on ${c.title}: ${a.text.slice(0, 140)}`, by: me.id, byName: me.name, boardId: after.id, cardId: c.id, link: link(c.id) });
    }
    if (a.t === "card.move") { const b0 = findCard(before, a.cardId), b1 = findCard(after, a.cardId); if (b0 && b1 && b0.list.id !== b1.list.id) for (const w of new Set([...b1.card.watchers, ...b1.list.watchers])) if (w !== me.id && memberOf(after, w)) await notify(w, { kind: "moved", text: `moved ${b1.card.title} from ${b0.list.title} to ${b1.list.title}`, by: me.id, byName: me.name, boardId: after.id, cardId: b1.card.id, link: link(b1.card.id) }); }
  }
  // due reminders for card members (and watchers): rebuild schedules for cards whose dates/members changed
  const touched = new Set(applied.flatMap(a => ("cardId" in a && typeof a.cardId === "string" ? [a.cardId] : a.t === "card.copy" ? [a.newId] : [])));
  const people = new Set<string>(); const want = new Map<string, Scheduled[]>();
  for (const id of touched) { const c0 = findCard(before, id)?.card, c1 = findCard(after, id)?.card; for (const p of [...(c0?.members ?? []), ...(c1?.members ?? []), ...(c0?.watchers ?? []), ...(c1?.watchers ?? [])]) people.add(p); }
  for (const p of people) want.set(p, []);
  for (const id of touched) {
    const c = findCard(after, id)?.card; if (!c || !c.due || c.dueComplete || c.archived || c.reminder < 0) continue;
    if (new Date(c.due).getTime() < Date.now()) continue; // already due: no reminder
    const fireAt = new Date(Math.max(Date.now(), new Date(c.due).getTime() - c.reminder * 6e4)); // reminder time already passed → remind now
    for (const p of new Set([...c.members, ...c.watchers])) want.get(p)?.push({ key: `${after.id}:${c.id}`, fireAt: fireAt.toISOString(), text: `${c.title} is due ${dateToken(c.due)} (${REMINDER_LABEL(c.reminder).toLowerCase()})`, boardId: after.id, cardId: c.id });
  }
  const keys = new Set([...touched].map(id => `${after.id}:${id}`));
  for (const [p, items] of want) await mutateDoc<UserDoc>("user", p, u => (u ? { ...u, scheduled: [...u.scheduled.filter(x => !keys.has(x.key)), ...items].slice(-300) } : undefined));
}

/** Server-made board change (membership, joins). */
async function serverAction(me: UserDoc, boardId: string, body: ActionBody, check = true): Promise<Board> {
  let before: Board | null = null; const a = { ...body, id: uid("a"), at: now(), by: me.id, byName: me.name } as Action;
  const after = await mutateDoc<Board>("board", boardId, b => { if (!b) return undefined; before = b; if (check && !allowed(b, a)) return undefined; const n = applyAction(b, a); return n === b ? undefined : { ...n, version: b.version + 1 }; });
  if (!after || !before) throw new HttpError(404, "No such board");
  if (after !== before) await afterSave(before, after, [a], me);
  return after;
}

// ---------------------------------------------------------------- create / copy / delete / move boards
export type CreateBoard = { title: string; bg?: string; workspaceId: string; visibility?: Visibility; template?: string; fromBoard?: string; keepCards?: boolean };
export async function createBoard(s: SessionUser, o: CreateBoard): Promise<Board> {
  const u = await ensureUser(s); const me = personOf(u); const { ws } = await wsAdmin(u.id, o.workspaceId).catch(() => { throw new HttpError(403, "Pick a Workspace you belong to."); });
  if (u.boards.length >= LIMITS.boards) throw new HttpError(400, "You have too many boards. Close or delete some first.");
  const id = uid("b"); const vis: Visibility = o.visibility && ["private", "workspace", "public"].includes(o.visibility) ? o.visibility : "workspace";
  let b: Board;
  if (o.template) { const t = TEMPLATES.find(x => x.id === o.template); if (!t) throw new HttpError(404, "No such template"); b = buildFromTemplate(t, { id, title: o.title, workspaceId: ws.id, owner: me, visibility: vis }); }
  else if (o.fromBoard) { const acc = await access(u.id, o.fromBoard); if (!acc) throw new HttpError(404, "No such board"); b = copyBoard(acc.board, { id, title: o.title || acc.board.title, workspaceId: ws.id, owner: me, keepCards: o.keepCards !== false, visibility: vis }); }
  else { b = mkBoard({ id, title: o.title, bg: o.bg, workspaceId: ws.id, owner: me, visibility: vis }); b.lists = [mkList(id + "l0", "To do"), mkList(id + "l1", "Doing"), mkList(id + "l2", "Done")]; }
  if (o.bg && !o.template) b.bg = mkBoard({ id, title: "x", bg: o.bg, workspaceId: ws.id, owner: me }).bg;
  b.activity = [{ id: id + "a0", at: b.createdAt, by: me.id, byName: me.name, cardId: null, text: o.template ? "created this board from a template" : o.fromBoard ? "copied this board" : "created this board", ctext: "" }];
  await saveNewBoard(b); await addBoardToWorkspace(ws.id, b.id); await indexBoard(u.id, b.id, true);
  return b;
}
export async function deleteBoard(s: SessionUser, boardId: string) {
  const acc = await access(s.id, boardId); if (!acc || acc.role !== "admin") throw new HttpError(403, "Only board admins can delete a board.");
  if (!acc.board.closed) throw new HttpError(400, "Close the board before deleting it.");
  for (const m of acc.board.members) await indexBoard(m.id, boardId, false);
  await removeBoardFromWorkspace(acc.board.workspaceId, boardId);
  await delDoc("board", boardId); await delDoc("bsum", boardId);
}
export async function moveBoard(s: SessionUser, boardId: string, wsId: string): Promise<Board> {
  const acc = await access(s.id, boardId); if (!acc || acc.role !== "admin") throw new HttpError(403, "Only board admins can change the Workspace.");
  await wsAdmin(s.id, wsId).catch(() => { throw new HttpError(403, "You can only move boards into Workspaces you belong to."); });
  const from = acc.board.workspaceId; if (from === wsId) return acc.board;
  const me = await ensureUser(s);
  const b = (await mutateDoc<Board>("board", boardId, x => (x ? { ...x, workspaceId: wsId, version: x.version + 1, updatedAt: now() } : undefined)))!;
  await putDoc("bsum", b.id, toBSum(b)); await removeBoardFromWorkspace(from, boardId); await addBoardToWorkspace(wsId, boardId); void me;
  return b;
}
/** Move or copy a card or list to another board (Trello's "Move" / "Copy" with a board picker). */
export async function transfer(s: SessionUser, o: { kind: "card" | "list"; copy: boolean; fromBoard: string; itemId: string; toBoard: string; toList?: string; index: number }) {
  const me = await ensureUser(s); const src = await access(me.id, o.fromBoard), dst = await access(me.id, o.toBoard);
  if (!src || !dst || !src.role || src.role === "observer" || !dst.role || dst.role === "observer") throw new HttpError(403, "You need to be a member of both boards.");
  const at = now(); const by = { by: me.id, byName: me.name, at };
  if (o.kind === "card") {
    const hit = findCard(src.board, o.itemId); if (!hit) throw new HttpError(404, "No such card");
    const toList = dst.board.lists.find(l => l.id === o.toList && !l.archived); if (!toList) throw new HttpError(400, "Pick a list on the other board");
    const newId = uid("c"); const labels = hit.card.labels.map(id => src.board.labels.find(l => l.id === id)).map(l => l && dst.board.labels.find(x => x.color === l.color && x.name === l.name)?.id).filter((x): x is string => !!x);
    const members = hit.card.members.filter(id => memberOf(dst.board, id));
    let before: Board | null = null;
    const after = await mutateDoc<Board>("board", o.toBoard, b => {
      if (!b) return undefined; before = b; const seq = b.seq + 1;
      const card = { ...hit.card, id: newId, num: seq, labels, members, watchers: hit.card.watchers.filter(id => memberOf(b, id)), votes: [], custom: {}, archived: false, updatedAt: at,
        checklists: hit.card.checklists.map((cl, k) => ({ ...cl, id: `${newId}k${k}`, items: cl.items.map((i, j) => ({ ...i, id: `${newId}k${k}i${j}`, member: i.member && memberOf(b, i.member) ? i.member : null })) })),
        comments: o.copy ? [] : hit.card.comments, attachments: hit.card.attachments.map((x, i) => ({ ...x, id: `${newId}a${i}` })), cover: hit.card.cover?.attachmentId ? null : hit.card.cover };
      const lists = b.lists.map(l => { if (l.id !== toList.id) return l; const cards = [...l.cards]; cards.splice(Math.max(0, Math.min(cards.length, o.index)), 0, card); return { ...l, cards }; });
      const act = { id: uid("a"), ...by, cardId: newId, text: `${o.copy ? "copied" : "moved"} “${card.title}” from ${src.board.title} to ${toList.title}`, ctext: `${o.copy ? "copied" : "moved"} this card from ${src.board.title}` };
      return { ...b, lists, seq, activity: [act, ...b.activity].slice(0, LIMITS.activity), version: b.version + 1, updatedAt: at };
    });
    if (after && before) await putDoc("bsum", after.id, toBSum(after));
    if (!o.copy) await serverAction(me, o.fromBoard, { t: "card.delete", cardId: o.itemId });
    return { boardId: o.toBoard, cardId: newId };
  }
  const list = src.board.lists.find(l => l.id === o.itemId); if (!list) throw new HttpError(404, "No such list");
  const newId = uid("l");
  const after = await mutateDoc<Board>("board", o.toBoard, b => {
    if (!b) return undefined; let seq = b.seq;
    const cards = list.cards.filter(c => !o.copy || !c.archived).map((c, i) => { const id = `${newId}c${i}`; return { ...c, id, num: ++seq, labels: c.labels.map(x => src.board.labels.find(l => l.id === x)).map(l => l && b.labels.find(y => y.color === l.color && y.name === l.name)?.id).filter((x): x is string => !!x), members: c.members.filter(m => memberOf(b, m)), watchers: [], votes: [], custom: {}, comments: o.copy ? [] : c.comments,
      checklists: c.checklists.map((cl, k) => ({ ...cl, id: `${id}k${k}`, items: cl.items.map((it, j) => ({ ...it, id: `${id}k${k}i${j}`, member: null })) })), attachments: c.attachments.map((x, j) => ({ ...x, id: `${id}a${j}` })), cover: c.cover?.attachmentId ? null : c.cover }; });
    const lists = [...b.lists]; lists.splice(Math.max(0, Math.min(lists.length, o.index)), 0, { ...mkList(newId, list.title, cards), limit: list.limit });
    const act = { id: uid("a"), ...by, cardId: null, text: `${o.copy ? "copied" : "moved"} list “${list.title}” from ${src.board.title}`, ctext: "" };
    return { ...b, lists, seq, activity: [act, ...b.activity].slice(0, LIMITS.activity), version: b.version + 1, updatedAt: at };
  });
  if (after) await putDoc("bsum", after.id, toBSum(after));
  if (!o.copy) await serverAction(me, o.fromBoard, { t: "list.delete", listId: o.itemId }, false);
  return { boardId: o.toBoard, listId: newId };
}

// ---------------------------------------------------------------- members, invites, joining
async function userByEmail(email: string) { const r = await getDoc<{ id: string }>("email", emailKey(email)); return r ? getDoc<UserDoc>("user", r.id) : null; }
async function addPendingInvite(email: string, inv: PendingInvite) {
  await mutateDoc<{ items: PendingInvite[] }>("invite", emailKey(email), cur => ({ items: [inv, ...(cur?.items ?? []).filter(x => !(x.kind === inv.kind && x.id === inv.id))].slice(0, 50) }));
}
async function dropPendingInvite(email: string, kind: string, id: string) { await mutateDoc<{ items: PendingInvite[] }>("invite", emailKey(email), cur => (cur ? { items: cur.items.filter(x => !(x.kind === kind && x.id === id)) } : undefined)); }
/** Invite someone to a board by email. Existing accounts are added straight away (like Trello); others see the invite when they sign up with that address. */
export async function inviteToBoard(s: SessionUser, boardId: string, email: string, role: Role): Promise<{ added: boolean; board: Board }> {
  const me = await ensureUser(s); if (me.guest) throw new HttpError(401, "Sign in to invite people.");
  const acc = await access(me.id, boardId); if (!acc?.role || acc.role === "observer") throw new HttpError(403, "Only board members can invite people.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "That email address doesn't look right.");
  const r: Role = role === "admin" && acc.role === "admin" ? "admin" : role === "observer" ? "observer" : "normal";
  const target = await userByEmail(email);
  if (target) {
    const b = await serverAction(me, boardId, { t: "member.add", person: personOf(target), role: r });
    await notify(target.id, { kind: "added", text: `added you to the board ${b.title}`, by: me.id, byName: me.name, boardId, cardId: null, link: `/app/b/${boardId}` });
    return { added: true, board: b };
  }
  await addPendingInvite(email, { kind: "board", id: boardId, name: acc.board.title, role: r, byName: me.name, at: now() });
  return { added: false, board: acc.board };
}
export async function inviteToWorkspace(s: SessionUser, wsId: string, email: string, role: "admin" | "normal"): Promise<{ added: boolean; ws: Workspace }> {
  const me = await ensureUser(s); if (me.guest) throw new HttpError(401, "Sign in to invite people.");
  const { ws, admin } = await wsAdmin(me.id, wsId); if (!admin) throw new HttpError(403, "Only Workspace admins can invite members.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "That email address doesn't look right.");
  const target = await userByEmail(email);
  if (target) {
    const w = await joinWorkspace(target, wsId, role);
    await notify(target.id, { kind: "invite", text: `added you to the Workspace ${ws.name}`, by: me.id, byName: me.name, boardId: null, cardId: null, link: `/app/w/${wsId}` });
    return { added: true, ws: w };
  }
  const w = (await mutateDoc<Workspace>("workspace", wsId, x => (x ? { ...x, invites: [{ email: emailKey(email), role, by: me.name, at: now() }, ...x.invites.filter(i => i.email !== emailKey(email))].slice(0, 200) } : undefined)))!;
  await addPendingInvite(email, { kind: "workspace", id: wsId, name: ws.name, role, byName: me.name, at: now() });
  return { added: false, ws: w };
}
async function joinWorkspace(u: UserDoc, wsId: string, role: "admin" | "normal"): Promise<Workspace> {
  const me: WsMember = { ...personOf(u), role };
  const w = await mutateDoc<Workspace>("workspace", wsId, x => (x ? (x.members.some(m => m.id === u.id) ? undefined : { ...x, members: [...x.members, me], invites: x.invites.filter(i => i.email !== emailKey(u.email)) }) : undefined));
  if (!w) throw new HttpError(404, "That Workspace no longer exists.");
  await mutateDoc<UserDoc>("user", u.id, x => (x && !x.workspaces.includes(wsId) ? { ...x, workspaces: [...x.workspaces, wsId] } : undefined));
  return w;
}
/** Accept (or decline) an invite addressed to the signed-in user's email. */
export async function answerInvite(s: SessionUser, kind: "workspace" | "board", id: string, accept: boolean) {
  const u = await ensureUser(s); if (u.guest || !u.email) throw new HttpError(401, "Sign in first.");
  const inv = (await getDoc<{ items: PendingInvite[] }>("invite", emailKey(u.email)))?.items.find(x => x.kind === kind && x.id === id);
  if (!inv) throw new HttpError(404, "That invitation has expired.");
  await dropPendingInvite(u.email, kind, id);
  if (!accept) { if (kind === "workspace") await mutateDoc<Workspace>("workspace", id, w => (w ? { ...w, invites: w.invites.filter(i => i.email !== emailKey(u.email)) } : undefined)); return null; }
  if (kind === "workspace") return { workspace: await joinWorkspace(u, id, inv.role === "admin" ? "admin" : "normal") };
  return { board: await serverAction(u, id, { t: "member.add", person: personOf(u), role: inv.role }, false) };
}
async function acceptPendingInvites(u: UserDoc) { void u; /* invites are shown on the boards page and accepted explicitly */ }

/** Invite links: one per board or workspace; anyone with the link can join as a normal member. */
export async function inviteLink(s: SessionUser, kind: "board" | "workspace", id: string, reset = false): Promise<string> {
  const me = await ensureUser(s); if (me.guest) throw new HttpError(401, "Sign in to share invite links.");
  if (kind === "workspace") { const { ws, admin } = await wsAdmin(me.id, id); if (!admin) throw new HttpError(403, "Only Workspace admins can create invite links."); if (ws.inviteToken && !reset) return ws.inviteToken; }
  else { const acc = await access(me.id, id); if (!acc?.role || acc.role === "observer") throw new HttpError(403, "Only board members can share invite links."); const cur = await getDoc<{ token: string }>("boardtoken", id); if (cur?.token && !reset) return cur.token; }
  const token = "t" + secret(); await putDoc("token", token, { kind, id, by: me.id });
  if (kind === "workspace") await mutateDoc<Workspace>("workspace", id, w => { if (!w) return undefined; if (w.inviteToken) void delDoc("token", w.inviteToken); return { ...w, inviteToken: token }; });
  else { const cur = await getDoc<{ token: string }>("boardtoken", id); if (cur?.token) await delDoc("token", cur.token); await putDoc("boardtoken", id, { token }); }
  return token;
}
export async function disableInviteLink(s: SessionUser, kind: "board" | "workspace", id: string) {
  const me = await ensureUser(s);
  if (kind === "workspace") { const { ws, admin } = await wsAdmin(me.id, id); if (!admin) throw new HttpError(403, "Only admins can do that."); if (ws.inviteToken) await delDoc("token", ws.inviteToken); await mutateDoc<Workspace>("workspace", id, w => (w ? { ...w, inviteToken: "" } : undefined)); }
  else { const acc = await access(me.id, id); if (acc?.role !== "admin") throw new HttpError(403, "Only board admins can do that."); const cur = await getDoc<{ token: string }>("boardtoken", id); if (cur?.token) await delDoc("token", cur.token); await delDoc("boardtoken", id); }
}
export async function tokenInfo(token: string) {
  if (!isId(token.slice(0, 60)) || token.length > 80) return null; const t = await getDoc<{ kind: "board" | "workspace"; id: string; by: string }>("token", token); if (!t) return null;
  if (t.kind === "board") { const b = await getBoard(t.id); return b ? { ...t, name: b.title, bg: b.bg } : null; }
  const w = await getDoc<Workspace>("workspace", t.id); return w ? { ...t, name: w.name, bg: "" } : null;
}
export async function joinByToken(s: SessionUser, token: string): Promise<string> {
  const u = await ensureUser(s); if (u.guest) throw new HttpError(401, "Sign in to join.");
  const t = await tokenInfo(token); if (!t) throw new HttpError(404, "This invite link is no longer active.");
  if (t.kind === "workspace") { await joinWorkspace(u, t.id, "normal"); return `/app/w/${t.id}`; }
  await serverAction(u, t.id, { t: "member.add", person: personOf(u), role: "normal" }, false); return `/app/b/${t.id}`;
}
/** Workspace members can join a Workspace-visible board themselves. */
export async function joinBoard(s: SessionUser, boardId: string): Promise<Board> {
  const u = await ensureUser(s); const acc = await access(u.id, boardId); if (!acc) throw new HttpError(404, "No such board");
  if (acc.role) return acc.board; if (acc.via !== "workspace") throw new HttpError(403, "Ask a board member to invite you.");
  return serverAction(u, boardId, { t: "member.add", person: personOf(u), role: "normal" }, false);
}
export async function boardMemberAction(s: SessionUser, boardId: string, body: ActionBody) { const u = await ensureUser(s); return serverAction(u, boardId, body); }

// ---------------------------------------------------------------- workspaces
export async function createWorkspace(s: SessionUser, o: { name: string; type?: string; desc?: string }): Promise<Workspace> {
  const u = await ensureUser(s); if (u.workspaces.length >= 50) throw new HttpError(400, "That's a lot of Workspaces. Delete one first.");
  const ws = newWorkspace(uid("w"), o.name.trim() || "New Workspace", personOf(u)); ws.desc = (o.desc ?? "").slice(0, 1000);
  ws.type = (["education", "engineering", "hr", "marketing", "operations", "sales", "small-business", "other"].includes(o.type ?? "") ? o.type : "") as Workspace["type"];
  await putDoc("workspace", ws.id, ws); await mutateDoc<UserDoc>("user", u.id, x => (x ? { ...x, workspaces: [...x.workspaces, ws.id] } : undefined));
  return ws;
}
export async function patchWorkspace(s: SessionUser, wsId: string, p: Partial<Pick<Workspace, "name" | "short" | "desc" | "website" | "type" | "visibility">>): Promise<Workspace> {
  const { admin } = await wsAdmin(s.id, wsId); if (!admin) throw new HttpError(403, "Only Workspace admins can change settings.");
  return (await mutateDoc<Workspace>("workspace", wsId, w => {
    if (!w) return undefined; const n = { ...w };
    if (typeof p.name === "string" && p.name.trim()) n.name = p.name.trim().slice(0, 100);
    if (typeof p.short === "string") { const sh = p.short.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 40); if (sh.length >= 3) n.short = sh; }
    if (typeof p.desc === "string") n.desc = p.desc.slice(0, 1000);
    if (typeof p.website === "string") n.website = /^https?:\/\/\S+$/.test(p.website) || p.website === "" ? p.website.slice(0, 300) : n.website;
    if (typeof p.type === "string" && ["", "education", "engineering", "hr", "marketing", "operations", "sales", "small-business", "other"].includes(p.type)) n.type = p.type as Workspace["type"];
    if (p.visibility === "private" || p.visibility === "public") n.visibility = p.visibility;
    return n;
  }))!;
}
export async function setWorkspaceRole(s: SessionUser, wsId: string, userId: string, role: "admin" | "normal" | null): Promise<Workspace> {
  const { ws, admin } = await wsAdmin(s.id, wsId);
  if (!admin && !(role === null && userId === s.id)) throw new HttpError(403, "Only Workspace admins can change members.");
  const target = ws.members.find(m => m.id === userId); if (!target) throw new HttpError(404, "Not a member");
  const admins = ws.members.filter(m => m.role === "admin");
  if (target.role === "admin" && role !== "admin" && admins.length < 2) throw new HttpError(400, "A Workspace needs at least one admin. Make someone else an admin first.");
  const w = (await mutateDoc<Workspace>("workspace", wsId, x => (x ? { ...x, members: role ? x.members.map(m => (m.id === userId ? { ...m, role } : m)) : x.members.filter(m => m.id !== userId) } : undefined)))!;
  if (!role) await mutateDoc<UserDoc>("user", userId, u => (u ? { ...u, workspaces: u.workspaces.filter(x => x !== wsId) } : undefined));
  return w;
}
export async function cancelWorkspaceInvite(s: SessionUser, wsId: string, email: string) {
  const { admin } = await wsAdmin(s.id, wsId); if (!admin) throw new HttpError(403, "Only admins can do that.");
  await mutateDoc<Workspace>("workspace", wsId, w => (w ? { ...w, invites: w.invites.filter(i => i.email !== emailKey(email)) } : undefined)); await dropPendingInvite(email, "workspace", wsId);
}
export async function deleteWorkspace(s: SessionUser, wsId: string) {
  const { ws, admin } = await wsAdmin(s.id, wsId); if (!admin) throw new HttpError(403, "Only Workspace admins can delete a Workspace.");
  const u = await ensureUser(s); if (u.workspaces.length < 2) throw new HttpError(400, "This is your only Workspace. Create another one before deleting it.");
  for (const id of ws.boards) { const b = await getBoard(id); if (!b) continue; for (const m of b.members) await indexBoard(m.id, id, false); await delDoc("board", id); await delDoc("bsum", id); }
  for (const m of ws.members) await mutateDoc<UserDoc>("user", m.id, x => (x ? { ...x, workspaces: x.workspaces.filter(w => w !== wsId) } : undefined));
  if (ws.inviteToken) await delDoc("token", ws.inviteToken);
  await delDoc("workspace", wsId);
}

// ---------------------------------------------------------------- search, member cards, activity
export async function accessibleBoards(s: SessionUser): Promise<{ me: UserDoc; boards: Board[] }> {
  const me = await loadMe(s); const boards = (await Promise.all(me.boards.map(b => getBoard(b.id)))).filter((b): b is Board => !!b);
  return { me: me.user, boards };
}
export type SearchHit = { boardId: string; boardTitle: string; bg: string; cardId: string; title: string; list: string; labels: string[]; due: string | null; dueComplete: boolean; archived: boolean; members: string[] };
/** Search cards and boards. Operators: @me / @username, #label, board:name, list:name, is:archived, is:open, is:starred, due:day|week|month|overdue, has:attachments|description|cover|members|checklist. */
export async function search(s: SessionUser, q: string) {
  const { me, boards } = await accessibleBoards(s); const t = Date.now();
  const tokens = (q.match(/(?:[^\s"]+|"[^"]*")+/g) ?? []).map(x => x.replace(/"/g, "")); const words: string[] = []; const ops: [string, string][] = [];
  for (const tok of tokens) { const m = tok.match(/^(@|#)(.+)$/) ?? tok.match(/^(board|list|is|due|has):(.+)$/i); if (m) ops.push([m[1]!.toLowerCase(), m[2]!.toLowerCase()]); else words.push(tok.toLowerCase()); }
  const archivedOk = ops.some(([k, v]) => k === "is" && v === "archived");
  const cards: SearchHit[] = []; const matchedBoards: BoardSummary[] = [];
  for (const b of boards) {
    if (cards.length >= 200) break;
    if (!words.length && !ops.length) break;
    if (words.length && !ops.length && words.every(w => b.title.toLowerCase().includes(w))) matchedBoards.push(summary(b, me.id));
    scan: for (const l of b.lists) for (const c of l.cards) {
      const archived = c.archived || l.archived; if (archivedOk ? !archived : archived) continue;
      const hay = [c.title, c.desc, ...c.comments.map(x => x.text), ...c.checklists.flatMap(cl => cl.items.map(i => i.text))].join("\n").toLowerCase();
      if (!words.every(w => hay.includes(w))) continue;
      const ok = ops.every(([k, v]) => {
        if (k === "@") return v === "me" ? c.members.includes(me.id) : c.members.some(id => memberOf(b, id)?.username.toLowerCase() === v);
        if (k === "#") return c.labels.some(id => { const lb = b.labels.find(x => x.id === id); return !!lb && (lb.name.toLowerCase() === v || lb.color.replace(/_.*/, "") === v); });
        if (k === "board") return b.title.toLowerCase().includes(v); if (k === "list") return l.title.toLowerCase().includes(v);
        if (k === "is") return v === "archived" ? archived : v === "open" ? !archived : v === "starred" ? me.starred.includes(b.id) : v === "complete" ? c.dueComplete : v === "incomplete" ? !c.dueComplete : true;
        if (k === "due") { if (!c.due) return false; const d = new Date(c.due).getTime() - t; return v === "overdue" ? d < 0 && !c.dueComplete : v === "day" ? d >= 0 && d <= 864e5 : v === "week" ? d >= 0 && d <= 7 * 864e5 : v === "month" ? d >= 0 && d <= 30 * 864e5 : true; }
        if (k === "has") return v === "attachments" ? c.attachments.length > 0 : v === "description" ? !!c.desc : v === "cover" ? !!c.cover : v === "members" ? c.members.length > 0 : v === "checklist" ? c.checklists.length > 0 : true;
        return true;
      });
      if (ok) cards.push({ boardId: b.id, boardTitle: b.title, bg: b.bg, cardId: c.id, title: c.title, list: l.title, labels: c.labels.map(id => b.labels.find(x => x.id === id)?.color ?? "").filter(Boolean), due: c.due, dueComplete: c.dueComplete, archived, members: c.members.map(id => memberOf(b, id)?.initials ?? "") });
      if (cards.length >= 200) break scan;
    }
  }
  return { cards, boards: matchedBoards };
}
export async function myCards(s: SessionUser) {
  const { me, boards } = await accessibleBoards(s);
  return boards.flatMap(b => b.lists.filter(l => !l.archived).flatMap(l => l.cards.filter(c => !c.archived && c.members.includes(me.id)).map(c => ({ boardId: b.id, boardTitle: b.title, bg: b.bg, workspaceId: b.workspaceId, cardId: c.id, title: c.title, list: l.title, labels: c.labels.map(id => b.labels.find(x => x.id === id)).filter(Boolean), due: c.due, dueComplete: c.dueComplete, start: c.start }))));
}
export async function myActivity(s: SessionUser, userId?: string) {
  const { me, boards } = await accessibleBoards(s); const who = userId ?? me.id;
  return boards.flatMap(b => b.activity.filter(a => a.by === who).map(a => ({ ...a, boardId: b.id, boardTitle: b.title }))).sort((x, y) => y.at.localeCompare(x.at)).slice(0, 200);
}

// ---------------------------------------------------------------- files
export type FileMeta = { id: string; name: string; mime: string; size: number; boardId: string | null; kind: "attachment" | "background" | "avatar"; owner: string; at: string };
export const MAX_UPLOAD = 4 * 1024 * 1024;
export async function saveFile(s: SessionUser, f: { name: string; mime: string; bytes: Uint8Array; kind: FileMeta["kind"]; boardId: string | null }): Promise<FileMeta> {
  if (f.bytes.length > MAX_UPLOAD) throw new HttpError(413, "Files can be up to 4 MB here.");
  if (f.kind !== "attachment" && !/^image\/(png|jpeg|gif|webp)$/.test(f.mime)) throw new HttpError(400, "Upload a PNG, JPEG, GIF or WebP image.");
  if (f.boardId) { const acc = await access(s.id, f.boardId); if (!acc?.role || acc.role === "observer") throw new HttpError(403, "You need to be a board member to upload here."); }
  else if (f.kind === "attachment") throw new HttpError(400, "Attachments belong to a board.");
  const { putBlob } = await import("@/lib/store");
  const meta: FileMeta = { id: "f" + secret(), name: f.name.slice(0, 256) || "file", mime: f.mime.slice(0, 100) || "application/octet-stream", size: f.bytes.length, boardId: f.boardId, kind: f.kind, owner: s.id, at: now() };
  await putBlob("files", meta.id, f.bytes); await putDoc("filemeta", meta.id, meta);
  return meta;
}
/** Attachments are readable by anyone who can see the board they were uploaded to, or (for copied and moved cards)
 *  a board passed as `viaBoard` that the reader can see and that has a card attaching this exact file. */
export async function readFile(s: SessionUser | null, id: string, viaBoard?: string | null): Promise<{ meta: FileMeta; bytes: Buffer } | null> {
  if (!isId(id)) return null; const meta = await getDoc<FileMeta>("filemeta", id); if (!meta) return null;
  if (meta.kind === "attachment") {
    if (!s) return null;
    let ok = !!meta.boardId && !!(await access(s.id, meta.boardId));
    if (!ok && viaBoard && isId(viaBoard)) { const acc = await access(s.id, viaBoard); ok = !!acc && acc.board.lists.some(l => l.cards.some(c => c.attachments.some(a => a.kind === "file" && a.url.endsWith("/api/files/" + id)))); }
    if (!ok) return null;
  }
  const { getBlob } = await import("@/lib/store"); const bytes = await getBlob("files", id); return bytes ? { meta, bytes } : null;
}
// Uploaded files are never deleted with a board: copied and moved cards on other boards keep pointing at them.

// ---------------------------------------------------------------- guests becoming accounts
/** A guest who signs in keeps everything: their user doc, workspaces and boards are re-keyed to the account id. */
export async function adoptGuest(guestId: string, s: SessionUser) {
  if (!guestId || guestId === s.id) return;
  const g = await getDoc<UserDoc>("user", guestId); if (!g) return;
  const swap = <T,>(x: T): T => JSON.parse(JSON.stringify(x).split(guestId).join(s.id));
  const name = s.name || usernameFrom(s.email); const fix = (p: Person): Person => (p.id === s.id ? { ...p, name, initials: initialsOf(name), email: s.email, username: usernameFrom(s.email || name) } : p);
  for (const id of g.boards) await mutateDoc<Board>("board", id, b => { if (!b) return undefined; const n = swap(b); n.members = n.members.map(m => ({ ...fix(m), role: m.role })); n.activity = n.activity.map(a => (a.by === s.id ? { ...a, byName: name } : a)); return { ...n, version: b.version + 1 }; });
  for (const id of g.boards) { const b = await getBoard(id); if (b) await putDoc("bsum", id, toBSum(b)); }
  for (const id of g.workspaces) await mutateDoc<Workspace>("workspace", id, w => { if (!w) return undefined; const n = swap(w); n.members = n.members.map(m => ({ ...fix(m), role: m.role })); if (n.name === "Guest Workspace") n.name = `${name.split(" ")[0]}'s Workspace`; return n; });
  const mine = await getDoc<UserDoc>("user", s.id);
  if (mine) await mutateDoc<UserDoc>("user", s.id, u => (u ? { ...u, workspaces: [...u.workspaces, ...g.workspaces.filter(w => !u.workspaces.includes(w))], boards: [...g.boards, ...u.boards.filter(b => !g.boards.includes(b))], starred: [...new Set([...u.starred, ...g.starred])], recent: [...g.recent, ...u.recent].slice(0, 12) } : undefined));
  else { const n = swap(g); const p = fix(personOf(n)); await putDoc("user", s.id, { ...n, ...p, guest: false }); if (s.email) await putDoc("email", emailKey(s.email), { id: s.id }); }
  await delDoc("user", guestId);
}
