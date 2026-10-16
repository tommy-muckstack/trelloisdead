import featsData from "@/lib/trFeats.json";
import Link from "next/link";
import { TrNav, TrFoot } from "@/components/TrHome";
import { GH } from "@/lib/links";
import "./trpricing.css";
import { PlanToggle } from "./PlanToggle";

const PLANS = [
  { n: "FREE", p: "0", s: "Free for up to 10 collaborators per Workspace", d: "Capture your to-dos, get organized, and get sh*t done.", b: "Get started", inc: "INCLUDED IN FREE:", f: ["Unlimited cards", "Up to 10 boards per Workspace", "Quickly capture to-dos from email, Slack, and Teams", "Inbox", "Unlimited Power-Ups per board", "Unlimited storage (10MB/file)", "250 Workspace command runs per month", "Custom backgrounds & stickers", "Unlimited activity log", "Assignee and due dates", "iOS and Android mobile apps", "2-factor authentication"], l: "" },
  { n: "STANDARD", p: "5", s: "Per user/month if billed annually ($6 billed monthly)", d: "Get more stuff done with AI features, unlimited boards, card mirroring, and more automation.", b: "Sign up now", inc: "EVERYTHING IN FREE, PLUS:", f: ["AI", "Unlimited boards", "Quickly capture to-dos from email, Slack, and Teams — powered by AI", "Planner", "Advanced checklists", "Card mirroring", "Custom Fields", "List colors", "Collapsible lists", "Unlimited storage (250MB/file)", "1,000 Workspace command runs per month", "Single board guests", "Saved searches"], l: "Learn more about Standard" },
  { n: "PREMIUM", p: "10", s: "Per user/month if billed annually ($12.50 billed monthly)", d: "Add AI to your boards and admin controls to your toolkit. Plus, get more perspective with views.", b: "Try for free", inc: "EVERYTHING IN STANDARD, PLUS:", f: ["AI", "Views: Calendar, Timeline, Table, Dashboard, and Map", "Workspace views: Table and Calendar", "Unlimited Workspace command runs", "Admin and security features", "Workspace-level templates", "Collections", "Observers", "Simple data export"], l: "Learn more about Premium", hot: true },
  { n: "ENTERPRISE", p: "17.50", s: "Per user/month - billed annually ($210.00 annual price per user)", d: "Add enterprise-grade security and controls. This plan includes Atlassian Guard Standard and 24/7 Enterprise Admin support.", b: "Contact sales", inc: "EVERYTHING IN PREMIUM, PLUS:", f: ["Unlimited Workspaces", "Organization-wide permissions", "Organization-visible boards", "Public board management", "Multi-board guests", "Attachment permissions", "Power-Up administration", "Free SSO and user provisioning with Atlassian Guard"], l: "Learn more about Enterprise" },
];
const FEATS = featsData as [string, string, string[], string, number][];
const FAQ: [string, string][] = [
  ["Is TrelloIsDead really free?", "Yes. There are no plans, trials or seat limits. Every account gets every feature: unlimited boards, all views, automation, Power-Ups and Workspaces."],
  ["Are the prices on this page what TrelloIsDead charges?", "No. The plan cards and the comparison table show Trello's published prices and features (checked October 2026), so you can see what you'd pay for the same features elsewhere. TrelloIsDead costs $0."],
  ["Do I need an account?", "No. You can start as a guest straight away. Sign up when you want to share boards or use them on another device; everything you made as a guest moves into your account."],
  ["Where is my data stored?", "Boards are saved on the server as you work (Google Cloud Firestore on the hosted version). You can export any board as JSON or CSV from the board menu."],
  ["Can I run my own copy?", "Yes. TrelloIsDead is open source under the Apache-2.0 license. See the self-hosting notes in the help center."],
  ["Is TrelloIsDead affiliated with Trello or Atlassian?", "No. It's an independent open-source project. Trello is a trademark of its owner."],
];
export function TrPricing() {
  return <div className="tr trp pk">
    <TrNav />
    <div className="tr-ban trp-ban">The plans below are <b>Trello&apos;s</b> published prices (October 2026), shown for comparison. TrelloIsDead gives you all of it for <b>$0</b>. <Link href="/signup"><u>Get started</u></Link></div>
    <section className="trp-hd"><h1>Every feature. One price: $0.</h1><p>No plans, no seat limits, no trial that runs out.</p><p>Here&apos;s what the same features cost on Trello.</p></section>
    <section className="trp-ours" id="ours"><div><small>TRELLOISDEAD</small><div className="pr"><sup>$</sup><b>0</b><u>USD</u></div><p>Everything in every Trello plan below that TrelloIsDead has built: unlimited boards, Table, Calendar, Timeline, Dashboard and Map views, unlimited automation, Power-Ups, Workspaces, guests and roles. Free for everyone, forever.</p></div><Link href="/signup" className="mk-btn">Get started free</Link></section>
    <section className="trp-plans" id="plans">{PLANS.map(p => <div key={p.n} className={"pl" + (p.hot ? " hot" : "")}><small>{p.n}</small><div className="pr"><sup>$</sup><b>{p.p}</b><u>USD</u></div><em>{p.s}</em><p>{p.d}</p><Link href="/signup" className="bt2">{p.n === "FREE" ? "Get started" : "Get these features free"}</Link><PlanToggle /><hr /><h6>{p.inc}</h6><ul>{p.f.map(x => <li key={x}>{x}</li>)}</ul>{p.l && <Link className="lm" href="/features">See TrelloIsDead&apos;s features</Link>}</div>)}</section>
    <section className="trp-cmp" id="compare"><h2>Compare Trello&apos;s plans</h2>
      <div className="th"><b>FEATURES</b><b>FREE</b><b>STANDARD</b><b>PREMIUM</b><b>ENTERPRISE</b></div>
      {FEATS.map(([t, d, v, lk, h]) => <div className="rw" key={t} style={{ minHeight: h }}><div className="ft"><b>{t}</b>{d && <span>{d}</span>}{lk && <span className="fl">{lk}</span>}</div>{v.map((x, i) => <div key={i} className={x === "✓" ? "ck" : "tx"}>{x}</div>)}</div>)}
      <div className="df"><h4>Didn&apos;t find what you were looking for?</h4><a href={GH + "/issues"} className="sg" target="_blank" rel="noopener noreferrer">Make a suggestion</a></div></section>
    <section className="trp-faq"><h2>Frequently asked questions</h2>{FAQ.map(([q, a]) => <details key={q}><summary><span>+</span>{q}</summary><p>{a}</p></details>)}</section>
    <section className="trp-guard"><div className="lock" /><div><h3>Want full control? Run your own copy.</h3><ul><li>Apache-2.0 open source</li><li>One Next.js app, Firestore or local files for storage</li></ul><p>Host TrelloIsDead on your own infrastructure, keep your data where you want it, and change anything you like.</p><Link className="lm2" href="/help#self-host">Self-hosting notes</Link></div></section>
    <TrFoot />
  </div>;
}
