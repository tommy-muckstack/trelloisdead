"use client";
// "101" tabs on the landing page: Boards / Views / Automation, each a real feature.
import Link from "next/link";
import { useState } from "react";
const TABS = [
  { t: "Boards", d: "Lists side by side, cards you drag from “to do” to “done”. Labels, dates, checklists and attachments live on the card.", c1: "To do", c2: "Doing", href: "/features#boards" },
  { t: "Views", d: "See the same cards as a table, a calendar, a timeline, a dashboard or a map. Switch any time; nothing has to be re-entered.", c1: "Calendar", c2: "Timeline", href: "/features#views" },
  { t: "Automation", d: "When a card lands in Done, mark it complete. One click to sort a list. Rules and buttons do the repetitive parts.", c1: "Rule", c2: "Button", href: "/features#automation" },
];
export function HomeTabs() {
  const [on, setOn] = useState(0); const cur = TABS[on]!;
  return <div className="tabs" role="tablist" aria-label="TrelloIsDead 101">
    {TABS.map((x, i) => <button key={x.t} type="button" role="tab" aria-selected={on === i} className={"t" + (on === i ? " on" : "")} onClick={() => setOn(i)}><b>{x.t}</b><span>{x.d}</span></button>)}
    <div className="img" role="tabpanel" aria-label={cur.t}><i className="c1">{cur.c1}</i><i className="c2">{cur.c2}</i><div className="c3" /><Link href={cur.href} className="tr-101__more">Learn about {cur.t.toLowerCase()} →</Link></div>
  </div>;
}
