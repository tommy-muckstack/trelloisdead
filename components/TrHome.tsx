import Link from "next/link";
import "./pk.css";
import "./trhome.css";
import "./trhome-m.css";
import "./marketing/marketing.css";
import { TrNav, TrFoot } from "@/components/marketing/Chrome";
import { GH, HUB } from "@/lib/links";
import { HomeTabs } from "@/components/marketing/HomeTabs";
import { BP } from "@/lib/basepath";
export { TrNav, TrFoot };

/** Email capture: goes to the sign-up page with the address filled in. */
function EmailForm() {
  return <form className="em" action={`${BP}/signup`} method="get"><input name="email" type="email" placeholder="Email" aria-label="Email" autoComplete="email" /><button className="bt" type="submit">Sign up - it&apos;s free!</button></form>;
}
export function TrHome() {
  return <div className="tr pk">
    <TrNav />
    <div className="tr-ban">Every feature, every account, $0: views, automation, Power-Ups and unlimited boards. <Link href="/pricing"><u>See how it compares.</u></Link></div>
    <section className="tr-hero"><div className="l"><h1>Plan it, drag it, finish it. Together.</h1><p>Boards, lists and cards for every project, with views, automation and sharing built in, and no per-seat bill.</p>
      <EmailForm />
      <p className="ack">By entering my email, I acknowledge the <Link href="/privacy">Privacy Policy</Link></p></div>
      <div className="r"><i className="o" /><i className="p" /><div className="ph"><div className="sc"><b>To do</b>{[1, 2, 3, 4].map(i => <u key={i} />)}</div></div><i className="ic a" /><i className="ic b" /><i className="ic c" /></div></section>
    <section className="tr-101"><small>TRELLOISDEAD 101</small><h3>Boards keep every piece of work visible. Views show it from every angle, and automation handles the repetitive parts, so nothing falls through the cracks.</h3><div className="dots"><i /><i /><i /></div>
      <HomeTabs /></section>
    <section className="tr-act"><h2>Work together, not in parallel</h2><p>Share a board with your team and everyone sees the same thing, as it changes.</p>
      <div className="cd a"><div className="im"><i /><i /></div><div className="tx"><small>SHARE AND ASSIGN</small><p>Invite teammates by email or with a link, put people on cards, and @mention them in comments. Notifications tell them what changed and when something is due.</p></div></div>
      <div className="cd b"><div className="tx"><small>STAY IN SYNC</small><p>Changes show up for everyone on the board within seconds, and two people editing at once never overwrite each other. Everything is saved as you go.</p></div><div className="im"><i /></div></div></section>
    <section className="tr-ws"><small>WORK SMARTER</small><h3>Customize the way you organize with Power-Ups, automation and ready-made templates.</h3>
      <div className="g3">{[["Power-Ups", "Add voting, list limits, card aging, custom fields and card numbers to any board, free.", "Browse Power-Ups", "/features#power-ups"], ["Automation", "Rules and buttons are built into every board. Move, label, assign and complete cards without lifting a finger.", "Get to know Automation", "/features#automation"], ["Templates", "Start from twelve ready-made boards for sprints, content calendars, sales pipelines and more.", "Browse templates", "/templates"]].map(([t, d, b, h], i) => <div key={t}><i className={"g" + i} /><h4>{t}</h4><p>{d}</p><Link href={h!}>{b}</Link></div>)}</div>
      <div className="tm"><div className="a"><p>TrelloIsDead is open source under the Apache-2.0 license. Run it as is, self-host it, or fork it and make it yours.</p><small>Built in the open<br />Issues and pull requests welcome</small><a href={GH} target="_blank" rel="noopener noreferrer"><u>Read the code</u></a></div><div className="b"><h4>6 views, 5 Power-Ups, 12 templates and unlimited boards on every account.</h4><small>No plans, no seat limits</small></div></div>
    </section>
    <section className="tr-end"><h2>Get started with TrelloIsDead today</h2><EmailForm /><p>By entering my email, I acknowledge the <Link href="/privacy">Privacy Policy</Link></p></section>
    <TrFoot />
  </div>;
}
