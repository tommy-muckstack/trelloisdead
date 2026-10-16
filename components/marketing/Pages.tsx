// Small original marketing pages: features, solutions, help, about, privacy, terms, templates.
import Link from "next/link";
import { TrNav, TrFoot } from "@/components/marketing/Chrome";
import { GH, HUB } from "@/lib/links";
import { SHORTCUTS } from "@/components/app/shortcuts-data";
import { TEMPLATES, CATEGORIES } from "@/lib/templates";
import { bgCss } from "@/lib/model";
import "@/components/pk.css";
import "@/components/trhome.css";
import "@/components/trhome-m.css";
import "./marketing.css";

export function Page({ children }: { children: React.ReactNode }) {
  return <div className="tr pk"><TrNav /><main className="mk-page">{children}</main><TrFoot /></div>;
}
const CTA = () => <p style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 32 }}><Link className="mk-btn" href="/signup">Get started free</Link><Link className="mk-btn ghost" href="/app">Try it without an account</Link></p>;

export function FeaturesPage() {
  return <Page><h1>Features</h1><p className="lede">Everything below is in every account. There are no plans to upgrade to.</p>
    <nav className="mk-toc" aria-label="On this page">{[["boards", "Boards"], ["cards", "Cards"], ["views", "Views"], ["automation", "Automation"], ["power-ups", "Power-Ups"], ["collaboration", "Collaboration"]].map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}</nav>
    <h2 id="boards">Boards</h2><p>Lists sit side by side; cards move between them with drag and drop or the keyboard. Star boards, pick a photo or colour background (or upload your own), copy a board, turn it into a template, and close or delete it when you&apos;re done. Lists have their own menu: copy, move to another board, sort, move all cards, watch and archive.</p>
    <h2 id="cards">Cards</h2><p>A card holds everything about one piece of work: members, named labels, start and due dates with reminders, several checklists (with per-item due dates and assignees), attachments and links, a cover, a location, custom fields, a Markdown description, and comments with @mentions. Every change is logged in the card&apos;s activity.</p>
    <h2 id="views">Views</h2><div className="mk-grid">{[["Table", "Every card in one sortable list. Move and add cards inline."], ["Calendar", "Cards on their due dates. Drag a card to reschedule it."], ["Timeline", "Start-to-due bars grouped by list. Drag to shift dates."], ["Dashboard", "Cards per list, due status, member and label."], ["Map", "Cards with a location, on an OpenStreetMap map."]].map(([t, d]) => <div key={t} className="mk-box"><h3>{t}</h3><p>{d}</p></div>)}</div>
    <h2 id="automation">Automation</h2><p>Rules run when something happens: a card is added to or moved into a list, marked complete, finishes its checklist, or gets a label. They can move, label, complete, schedule, assign, add a checklist or archive. Card buttons put your own one-click actions on every card; board buttons sort, archive or move whole lists. There&apos;s no monthly limit on runs.</p>
    <h2 id="power-ups">Power-Ups</h2><div className="mk-grid">{[["Voting", "Vote on cards; sort lists by votes."], ["Card Aging", "Untouched cards fade so stale work stands out."], ["List Limits", "Set a work-in-progress limit; the list turns red when it's over."], ["Custom Fields", "Text, number, date, checkbox and dropdown fields."], ["Card Numbers", "Show each card's #number on the front."]].map(([t, d]) => <div key={t} className="mk-box"><h3>{t}</h3><p>{d}</p></div>)}</div>
    <h2 id="collaboration">Collaboration</h2><p>Workspaces group boards and people. Invite by email or with a link, choose who is an admin, member or observer, and decide whether a board is private, visible to the Workspace or public. Notifications tell you when you&apos;re added to a card, mentioned, or when something you watch changes or comes due. Two people can edit the same board at once without overwriting each other.</p>
    <CTA /></Page>;
}
const SOLUTIONS: [string, string, string, string][] = [
  ["marketing", "Marketing teams", "Plan campaigns and content on a calendar, keep briefs and assets on the card, and see what ships this week.", "content-calendar"],
  ["product", "Product management", "A now / next / later roadmap that shows direction without promising dates, plus a decision log.", "product-roadmap"],
  ["engineering", "Engineering teams", "Run sprints with a backlog, code review and QA lists. Labels for bugs, features and tech debt; automation for the hand-offs.", "sprint"],
  ["design", "Design teams", "Move work from brief to handoff with feedback rounds, attachments as covers and a list for open questions.", "design-sprint"],
  ["remote", "Remote teams", "Team info, weekly priorities, async standups and a decisions log in one shared place.", "remote-team"],
  ["education", "Students and teachers", "One list per course, assignments by due date, and a calendar view for exam season.", "course-planner"],
];
export function SolutionsPage() {
  return <Page><h1>Solutions</h1><p className="lede">Start from a template built for the way your team works, then change anything.</p>
    {SOLUTIONS.map(([id, t, d, tpl]) => { const x = TEMPLATES.find(y => y.id === tpl)!; return <section key={id}><h2 id={id}>{t}</h2><p>{d}</p><Link className="mk-tpl" href={`/app/templates?t=${tpl}`} style={{ maxWidth: 360 }}><i style={{ background: bgCss(x.bg, true) }} /><div><b>Template: {x.title}</b><small>{x.lists.map(l => l.t).join(" · ")}</small></div></Link></section>; })}
    <CTA /></Page>;
}
export function TemplatesPublicPage() {
  return <Page><h1>Templates</h1><p className="lede">Twelve ready-made boards. Pick one and it becomes a real board you can change.</p>
    {CATEGORIES.map(c => { const ts = TEMPLATES.filter(t => t.cat === c); if (!ts.length) return null; return <section key={c}><h2 id={c.toLowerCase().replace(/\s+/g, "-")}>{c}</h2><div className="mk-grid">{ts.map(t => <Link key={t.id} className="mk-tpl" href={`/app/templates?t=${t.id}`}><i style={{ background: bgCss(t.bg, true) }} /><div><b>{t.title}</b><small>{t.desc}</small></div></Link>)}</div></section>; })}
  </Page>;
}
export function HelpPage() {
  return <Page><h1>Help center</h1><p className="lede">How TrelloIsDead works, in a few minutes of reading.</p>
    <nav className="mk-toc" aria-label="On this page">{[["start", "Getting started"], ["boards", "Boards and lists"], ["cards", "Cards"], ["sharing", "Sharing"], ["views", "Views and automation"], ["shortcuts", "Keyboard shortcuts"], ["account", "Account"], ["self-host", "Self-hosting"]].map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}</nav>
    <h2 id="start">Getting started</h2><ol><li>Open <Link href="/app">the app</Link>. You start as a guest with a first board; no sign-up needed.</li><li>Add lists for each stage of work and cards for each task. Drag cards as work moves.</li><li>Open a card to add details: members, labels, dates, checklists, attachments, comments.</li><li><Link href="/signup">Sign up</Link> to keep your work across devices and to share boards. Everything you made as a guest comes with you.</li></ol>
    <h2 id="boards">Boards and lists</h2><p>Create boards from the <b>Create</b> button or a template. The ⋯ menu on the board header has About, Activity, Archived items, Settings, background, labels, copy, export (JSON or CSV), print, make template and close board. Closed boards can be reopened or deleted from the bottom of the boards page. Each list&apos;s ⋯ menu copies, moves, sorts, watches or archives it.</p>
    <h2 id="cards">Cards</h2><p>Click a card (or press Enter on a selected card) to open it. Cards have their own link, so you can share them. Archive a card to hide it; restore or delete it from Archived items. Use <code>Ctrl/⌘+Enter</code> to save a comment or description.</p>
    <h2 id="sharing">Sharing</h2><p>Use <b>Share</b> on a board to invite people by email or create an invite link. People with an account are added straight away; anyone else sees the invitation when they sign up with that email (TrelloIsDead doesn&apos;t send invitation emails, so send them the link too). Roles: admins change settings and members, members edit, observers view and comment.</p>
    <h2 id="views">Views and automation</h2><p>Switch views from the board header: Board, Table, Calendar, Timeline, Dashboard, Map. Add Power-Ups with the rocket button and create rules and buttons with the lightning button. The filter applies to every view.</p>
    <h2 id="shortcuts">Keyboard shortcuts</h2><p>Press <code>?</code> anywhere in the app to see this list. Turn shortcuts off in Settings.</p>
    <table style={{ borderCollapse: "collapse", width: "100%" }}><tbody>{SHORTCUTS.map(([k, d]) => <tr key={k} style={{ borderBottom: "1px solid #dfe1e6" }}><td style={{ padding: "8px 12px 8px 0", whiteSpace: "nowrap" }}><code>{k}</code></td><td style={{ padding: 8 }}>{d}</td></tr>)}</tbody></table>
    <h2 id="account">Account</h2><p>Log in with email and password or Google. Forgot your password? Use <Link href="/forgot-password">Can&apos;t log in?</Link> and we&apos;ll email a reset link. Change your name, @username, photo, theme and accessibility options from the avatar menu.</p>
    <h2 id="self-host">Self-hosting</h2><p>TrelloIsDead is a single Next.js app under the Apache-2.0 license. Clone <a href={GH}>the repository</a>, run <code>npm ci</code> and <code>npm run dev</code>. Without any configuration it stores data in local JSON files and offers guest and demo accounts. For production, set the Firebase variables listed in the README to use Firebase Auth and Firestore, and <code>AUTH_SECRET</code> for guest sessions.</p>
  </Page>;
}
export function AboutPage() {
  return <Page><h1>About TrelloIsDead</h1><p className="lede">A free, open-source kanban app with the features people pay per seat for elsewhere.</p>
    <p>TrelloIsDead is part of <a href={HUB}>IsDead</a>, a set of open-source clones of popular paid apps. The idea is simple: the everyday features of a tool like this shouldn&apos;t cost every person on your team a monthly fee.</p>
    <h2>What&apos;s in it</h2><p>Boards, lists and cards; Workspaces, sharing and roles; checklists, dates, reminders, attachments, comments and mentions; Table, Calendar, Timeline, Dashboard and Map views; automation rules and buttons; Power-Ups; templates; search; notifications; keyboard shortcuts; light and dark themes. See <Link href="/features">Features</Link>.</p>
    <h2>What it isn&apos;t</h2><p>It isn&apos;t Trello, and it isn&apos;t affiliated with, endorsed by or sponsored by Atlassian or Trello. It doesn&apos;t import from Trello, doesn&apos;t connect to third-party Power-Ups, and doesn&apos;t send notification or invitation emails (only the sign-up verification and password-reset emails that Firebase sends).</p>
    <h2>Open source</h2><p>The code is on <a href={GH}>GitHub</a> under the Apache-2.0 license. Bug reports, ideas and pull requests are welcome there.</p><CTA /></Page>;
}
export function PrivacyPage() {
  return <Page><h1>Privacy Policy</h1><p className="lede">What TrelloIsDead stores, and why. Last updated October 2026.</p>
    <h2>What we store</h2><ul><li><b>Your account:</b> email address, display name and (if you sign in with Google) the name on your Google account, handled by Firebase Authentication.</li><li><b>Your work:</b> Workspaces, boards, lists, cards, comments, activity and files you upload, stored in Google Cloud Firestore so they&apos;re available on every device.</li><li><b>Profile details</b> you choose to add: @username, bio and photo.</li></ul>
    <h2>Cookies</h2><p>We use only the cookies needed to run the app: a session cookie when you&apos;re signed in, and a guest cookie if you use the app without an account. No advertising or analytics cookies.</p>
    <h2>Who can see your work</h2><p>Boards are visible to the people you share them with, according to the board&apos;s visibility (private, Workspace or public). Your email is visible to people who share a board or Workspace with you, so they can tell you apart; it isn&apos;t shown publicly.</p>
    <h2>Third parties</h2><p>Sign-in uses Firebase Authentication (Google). Data is stored in Google Cloud Firestore. Location search on cards sends your search text to OpenStreetMap&apos;s Nominatim service, and the Map view loads map tiles from OpenStreetMap. Board photos are served from this site.</p>
    <h2>Your choices</h2><p>Export any board as JSON or CSV from the board menu. Delete boards and Workspaces at any time. To delete your account, open an issue on <a href={GH + "/issues"}>GitHub</a> from an address we can verify.</p></Page>;
}
export function TermsPage() {
  return <Page><h1>Terms</h1><p className="lede">The short version: use it, don&apos;t abuse it, and keep your own backups. Last updated October 2026.</p>
    <h2>The service</h2><p>TrelloIsDead is provided free of charge, as is, without warranty of any kind, as described in the Apache-2.0 license that covers its source code. It may change or stop at any time.</p>
    <h2>Your content</h2><p>You own what you put on your boards. You&apos;re responsible for it, and for sharing it only with people allowed to see it. Don&apos;t upload anything illegal or anything you don&apos;t have the right to share.</p>
    <h2>Acceptable use</h2><p>Don&apos;t try to break, overload or get around the security of the service, and don&apos;t use it to send spam or harass anyone. We may remove content or accounts that do.</p>
    <h2>Trademarks</h2><p>TrelloIsDead is an independent open-source project, not affiliated with, endorsed by or sponsored by Atlassian or Trello. Trello is a trademark of its owner.</p></Page>;
}
