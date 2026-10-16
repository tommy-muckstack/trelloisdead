// Board templates for the template gallery. Original content written for TrelloIsDead: every list and card is a
// usable starting point, not lorem ipsum. A template becomes a real board through buildFromTemplate().
import { mkBoard, mkCard, mkList, type Board, type Card, type Person, type Visibility } from "./model";

type TCard = { t: string; d?: string; l?: number[]; c?: [string, string[]][]; due?: number };
type TList = { t: string; cards: TCard[] };
export type Template = { id: string; title: string; cat: string; desc: string; bg: string; labels: { color: string; name: string }[]; lists: TList[] };
export const CATEGORIES = ["Business", "Design", "Education", "Engineering", "Marketing", "Personal", "Product management", "Productivity", "Project management", "Remote work", "Sales", "Support"] as const;

export const TEMPLATES: Template[] = [
  { id: "kanban", title: "Simple project board", cat: "Project management", bg: "p1015", desc: "The classic To do, Doing, Done board with a backlog and a review step. Start here if you're not sure which template you need.",
    labels: [{ color: "red", name: "Urgent" }, { color: "yellow", name: "Waiting" }, { color: "green", name: "Quick win" }, { color: "blue", name: "Research" }],
    lists: [
      { t: "Backlog", cards: [{ t: "Collect ideas from the team", d: "Drop every idea here as its own card. Don't sort yet." }, { t: "Write the project brief", l: [3], c: [["Brief", ["Goal in one sentence", "Who it's for", "What done looks like", "Deadline"]]] }] },
      { t: "To do", cards: [{ t: "Book the kickoff meeting", l: [2], due: 2 }, { t: "Agree on owners for each workstream", l: [0] }] },
      { t: "Doing", cards: [{ t: "Draft the timeline", d: "Work backwards from the deadline. Add a card per milestone." }] },
      { t: "Review", cards: [] },
      { t: "Done", cards: [{ t: "Create the project board", l: [2] }] },
    ] },
  { id: "weekly-planner", title: "Weekly planner", cat: "Productivity", bg: "p110", desc: "One list per day plus a parking lot. Plan Sunday night, move cards as the week changes, and archive Friday's done list.",
    labels: [{ color: "purple", name: "Deep work" }, { color: "sky", name: "Meeting" }, { color: "lime", name: "Errand" }, { color: "orange", name: "Must do" }],
    lists: [
      { t: "This week", cards: [{ t: "Top three goals for the week", c: [["Goals", ["", "", ""].map((_, i) => `Goal ${i + 1}`)]] }] },
      { t: "Monday", cards: [{ t: "Plan the week (20 min)", l: [3] }] }, { t: "Tuesday", cards: [] }, { t: "Wednesday", cards: [] }, { t: "Thursday", cards: [] },
      { t: "Friday", cards: [{ t: "Weekly review", l: [0], c: [["Review", ["Archive what's done", "Move leftovers to next week", "Note one thing to improve"]]] }] },
      { t: "Someday", cards: [{ t: "Ideas that can wait", d: "Park anything that isn't for this week here so it stops nagging you." }] },
    ] },
  { id: "sprint", title: "Agile sprint board", cat: "Engineering", bg: "p1022", desc: "Run a two-week sprint: groomed backlog, sprint commitment, in progress, code review, QA and done. Labels mark bugs, features and tech debt.",
    labels: [{ color: "red", name: "Bug" }, { color: "green", name: "Feature" }, { color: "purple", name: "Tech debt" }, { color: "orange", name: "Blocked" }, { color: "blue", name: "Spike" }],
    lists: [
      { t: "Product backlog", cards: [{ t: "As a user, I can reset my password from the login page", l: [1], d: "Acceptance criteria:\n- Reset email arrives within a minute\n- Link expires after one hour\n- Old sessions are signed out" }, { t: "Upgrade the database driver", l: [2] }] },
      { t: "Sprint backlog", cards: [{ t: "Fix the date picker on Safari", l: [0] }, { t: "Spike: evaluate background job queues", l: [4], c: [["Questions", ["Retry semantics", "Cost at our volume", "Local dev story"]]] }] },
      { t: "In progress", cards: [{ t: "Add pagination to the activity feed", l: [1] }] },
      { t: "Code review", cards: [] }, { t: "QA", cards: [] },
      { t: "Done", cards: [{ t: "Sprint planning", c: [["Checklist", ["Velocity from last sprint", "Commitment agreed", "Sprint goal written down"]]] }] },
    ] },
  { id: "content-calendar", title: "Content calendar", cat: "Marketing", bg: "p1067", desc: "Plan, write, review and publish content across channels. Add due dates and use the Calendar view to see the publishing schedule.",
    labels: [{ color: "blue", name: "Blog" }, { color: "pink", name: "Social" }, { color: "yellow", name: "Newsletter" }, { color: "green", name: "Video" }],
    lists: [
      { t: "Ideas", cards: [{ t: "Customer story: how a small team ships weekly", l: [0] }, { t: "Behind the scenes photo series", l: [1] }] },
      { t: "Writing", cards: [{ t: "October newsletter", l: [2], due: 5, c: [["Sections", ["Product updates", "One useful tip", "Community highlight"]]] }] },
      { t: "Editing", cards: [] },
      { t: "Scheduled", cards: [{ t: "Launch announcement thread", l: [1], due: 3 }] },
      { t: "Published", cards: [] },
    ] },
  { id: "sales-pipeline", title: "Sales pipeline", cat: "Sales", bg: "p1050", desc: "Track deals from first contact to signed. One card per deal; put the next step and its date on the card so nothing goes cold.",
    labels: [{ color: "green", name: "Hot" }, { color: "yellow", name: "Warm" }, { color: "black_light", name: "Cold" }, { color: "purple", name: "Enterprise" }],
    lists: [
      { t: "Leads", cards: [{ t: "Example Co — inbound demo request", l: [1], d: "Source: website form\nNext step: reply with two time slots" }] },
      { t: "Contacted", cards: [] },
      { t: "Demo scheduled", cards: [{ t: "Prepare demo script", c: [["Demo", ["Their top three problems", "Tailored walkthrough", "Clear next step"]]] }] },
      { t: "Proposal sent", cards: [] }, { t: "Negotiation", cards: [] }, { t: "Won", cards: [] }, { t: "Lost", cards: [{ t: "Write down why we lost", d: "One line per lost deal. Review monthly." }] },
    ] },
  { id: "support-queue", title: "Customer support queue", cat: "Support", bg: "p124", desc: "Triage incoming requests, assign an owner, and keep customers updated. Card aging shows which tickets have been waiting too long.",
    labels: [{ color: "red", name: "P1" }, { color: "orange", name: "P2" }, { color: "yellow", name: "P3" }, { color: "blue", name: "Feature request" }, { color: "green", name: "How-to" }],
    lists: [
      { t: "New", cards: [{ t: "Can't export my data to CSV", l: [1] }, { t: "How do I add a teammate?", l: [4] }] },
      { t: "Triaged", cards: [] }, { t: "Waiting on customer", cards: [] }, { t: "Escalated to engineering", cards: [] },
      { t: "Resolved", cards: [{ t: "Saved replies", d: "Keep reusable answers as checklist items so the whole team uses the same wording.", c: [["Replies", ["Thanks for writing in", "We've reproduced this", "This is fixed now"]]] }] },
    ] },
  { id: "design-sprint", title: "Design project", cat: "Design", bg: "p1018", desc: "Move work from brief to handoff: research, explorations, feedback rounds and final assets, with a list for open questions.",
    labels: [{ color: "pink", name: "Visual" }, { color: "sky", name: "UX" }, { color: "lime", name: "Copy" }, { color: "orange", name: "Needs feedback" }],
    lists: [
      { t: "Brief & research", cards: [{ t: "Read the brief and list open questions", c: [["Research", ["Audience", "Competitors", "Constraints"]]] }] },
      { t: "Exploration", cards: [{ t: "Three rough directions", l: [0] }] },
      { t: "Feedback", cards: [{ t: "Review round 1", l: [3], due: 4 }] },
      { t: "Final", cards: [] },
      { t: "Handoff", cards: [{ t: "Export assets and specs", c: [["Handoff", ["Colors and type", "Spacing", "Assets at 1x and 2x"]]] }] },
    ] },
  { id: "course-planner", title: "Semester planner", cat: "Education", bg: "p1043", desc: "One list per course plus an assignments list sorted by due date. Built for students juggling several classes.",
    labels: [{ color: "red", name: "Exam" }, { color: "blue", name: "Reading" }, { color: "green", name: "Assignment" }, { color: "purple", name: "Group work" }],
    lists: [
      { t: "Due this week", cards: [{ t: "Problem set 3", l: [2], due: 3 }] },
      { t: "Course A", cards: [{ t: "Chapters 4–5", l: [1] }, { t: "Midterm", l: [0], due: 20, c: [["Study plan", ["Review lecture notes", "Practice exam", "Office hours"]]] }] },
      { t: "Course B", cards: [{ t: "Group presentation", l: [3] }] },
      { t: "Done", cards: [] },
    ] },
  { id: "personal-goals", title: "Personal goals", cat: "Personal", bg: "p29", desc: "Big goals broken into habits and next actions. Review on the first of every month.",
    labels: [{ color: "green", name: "Health" }, { color: "blue", name: "Money" }, { color: "purple", name: "Learning" }, { color: "pink", name: "People" }],
    lists: [
      { t: "This year", cards: [{ t: "Run a 10k", l: [0], c: [["Plan", ["3 runs a week", "5k by month two", "Sign up for a race"]]] }, { t: "Build a three-month emergency fund", l: [1] }] },
      { t: "This month", cards: [{ t: "Read two books", l: [2] }] },
      { t: "Habits", cards: [{ t: "Call someone you haven't spoken to in a while", l: [3] }] },
      { t: "Achieved", cards: [] },
    ] },
  { id: "remote-team", title: "Remote team hub", cat: "Remote work", bg: "p16", desc: "A home base for a distributed team: team info, weekly priorities, async standup questions and decisions log.",
    labels: [{ color: "blue", name: "Info" }, { color: "orange", name: "Decision" }, { color: "green", name: "Win" }],
    lists: [
      { t: "Team info", cards: [{ t: "How we work", l: [0], d: "Core hours, where we talk, how fast we reply, and how to ask for help." }, { t: "Who's who", l: [0] }] },
      { t: "This week's priorities", cards: [] },
      { t: "Async standup", cards: [{ t: "Answer by 11am your time", c: [["Questions", ["What did you finish?", "What's next?", "Anything blocking you?"]]] }] },
      { t: "Decisions log", cards: [{ t: "Write decisions here, one per card", l: [1], d: "Context, decision, who decided, date." }] },
      { t: "Wins", cards: [] },
    ] },
  { id: "product-roadmap", title: "Product roadmap", cat: "Product management", bg: "p1039", desc: "Now, next, later. A roadmap that shows direction without promising dates, plus a list for shipped work.",
    labels: [{ color: "green", name: "Growth" }, { color: "blue", name: "Core" }, { color: "purple", name: "Platform" }, { color: "red", name: "Customer ask" }],
    lists: [
      { t: "Now", cards: [{ t: "Faster onboarding", l: [0], d: "Problem: half of signups never create a second project.\nBet: a guided first project." }] },
      { t: "Next", cards: [{ t: "Team permissions", l: [1, 3] }] },
      { t: "Later", cards: [{ t: "Public API", l: [2] }] },
      { t: "Shipped", cards: [] },
      { t: "Not doing", cards: [{ t: "Explain why, so the question doesn't come back", d: "Saying no clearly is part of the roadmap." }] },
    ] },
  { id: "small-business", title: "Small business ops", cat: "Business", bg: "p1016", desc: "The recurring jobs that keep a small business running: orders, suppliers, bookkeeping and hiring, each with a checklist.",
    labels: [{ color: "green", name: "Money" }, { color: "orange", name: "Supplier" }, { color: "blue", name: "Admin" }, { color: "pink", name: "People" }],
    lists: [
      { t: "This week", cards: [{ t: "Reconcile last week's sales", l: [0], c: [["Steps", ["Export sales", "Match bank deposits", "Flag differences"]]] }] },
      { t: "Monthly", cards: [{ t: "Pay suppliers", l: [1] }, { t: "Quarterly tax estimate", l: [2] }] },
      { t: "Hiring", cards: [{ t: "Write the job post", l: [3] }] },
      { t: "Done", cards: [] },
    ] },
];

/** Build a real board from a template (ids are derived from the board id, so the server can rebuild the same board). */
export function buildFromTemplate(t: Template, o: { id: string; title?: string; workspaceId: string; owner: Person; visibility?: Visibility; at?: string }): Board {
  const at = o.at ?? new Date().toISOString();
  const b = mkBoard({ id: o.id, title: o.title || t.title, bg: t.bg, workspaceId: o.workspaceId, owner: o.owner, visibility: o.visibility, at });
  b.labels = t.labels.map((l, i) => ({ id: `${o.id}L${i}`, name: l.name, color: l.color }));
  let seq = 0;
  b.lists = t.lists.map((l, li) => mkList(`${o.id}l${li}`, l.t, l.cards.map((c, ci): Card => {
    const id = `${o.id}c${li}_${ci}`;
    return mkCard(id, ++seq, c.t, at, { desc: c.d ?? "", labels: (c.l ?? []).map(i => b.labels[i]!.id).filter(Boolean), due: c.due ? new Date(new Date(at).getTime() + c.due * 864e5).toISOString() : null,
      checklists: (c.c ?? []).map(([title, items], k) => ({ id: `${id}k${k}`, title, items: items.map((text, j) => ({ id: `${id}k${k}i${j}`, text, done: false, due: null, member: null })) })) });
  })));
  b.seq = seq;
  return b;
}
/** Copy an existing board (Trello's "Copy board" / "Create board from template"): same lists, labels and cards. */
export function copyBoard(src: Board, o: { id: string; title: string; workspaceId: string; owner: Person; keepCards: boolean; visibility?: Visibility; at?: string }): Board {
  const at = o.at ?? new Date().toISOString();
  const b = mkBoard({ id: o.id, title: o.title, bg: src.bg, workspaceId: o.workspaceId, owner: o.owner, visibility: o.visibility ?? src.visibility, at });
  const labelMap = new Map(src.labels.map((l, i) => [l.id, `${o.id}L${i}`]));
  b.labels = src.labels.map(l => ({ ...l, id: labelMap.get(l.id)! })); b.fields = src.fields.map(f => ({ ...f })); b.powerUps = [...src.powerUps]; b.settings = { ...src.settings };
  let seq = 0;
  b.lists = src.lists.filter(l => !l.archived).map((l, li) => ({ ...mkList(`${o.id}l${li}`, l.title, !o.keepCards ? [] : l.cards.filter(c => !c.archived).map((c, ci) => {
    const id = `${o.id}c${li}_${ci}`;
    return mkCard(id, ++seq, c.title, at, { desc: c.desc, labels: c.labels.map(x => labelMap.get(x)!).filter(Boolean), start: c.start, due: c.due, reminder: c.reminder, location: c.location, custom: { ...c.custom },
      cover: c.cover?.color ? { ...c.cover } : null, checklists: c.checklists.map((cl, k) => ({ ...cl, id: `${id}k${k}`, items: cl.items.map((i, j) => ({ ...i, id: `${id}k${k}i${j}`, done: false, member: null })) })) });
  })), limit: l.limit }));
  b.seq = seq;
  return b;
}
