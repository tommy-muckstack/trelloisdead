import Link from "next/link";
import "./pk.css";
import "./trhome.css";
import "./trhome-m.css";

export const TrLogo = ({ c = "#172b4d" }: { c?: string }) => <span className="tr-logo" style={{ color: c }}><small>ATLASSIAN</small><span><svg width="26" height="26" viewBox="0 0 26 26" aria-hidden><rect width="26" height="26" rx="4" fill="#0c66e4" /><rect x="5" y="5" width="6.5" height="14" rx="1.2" fill="#fff" /><rect x="14.500" y="5" width="6.500" height="8.500" rx="1.200" fill="#fff" /></svg>TrelloIsDead</span></span>;
export function TrNav() {
  return <header className="tr-nav"><Link href="/" className="lg"><TrLogo /></Link><nav><a>Features <i>⌄</i></a><a>Solutions <i>⌄</i></a><a>Plans <i>⌄</i></a><Link href="/pricing">Pricing</Link><a>Resources <i>⌄</i></a></nav><span className="sp" /><Link href="/login" className="li">Log in</Link><Link href="/login" className="cta">Get TrelloIsDead for free</Link><span className="hb" aria-hidden><i /><i /><i /></span></header>;
}
export function TrFoot({ h = 230 }: { h?: number }) {
  return <footer className="tr-foot" style={{ height: h }}><div className="row"><div className="lg"><TrLogo c="#fff" /><Link href="/login" className="lo">Log In</Link></div>{[["About TrelloIsDead", "What's behind the boards."], ["Jobs", "Learn about open roles on the TrelloIsDead team."], ["Apps", "Download the TrelloIsDead App for your Desktop or Mobile devices."], ["Contact us", "Need anything? Get in touch and we can help."]].map(([a, b]) => <div key={a}><b>{a}</b><span>{b}</span></div>)}</div>
    <div className="bar"><span className="lang">🌐 English <i>⌄</i></span><span>Your Privacy Choices</span><span>Privacy Policy</span><span>Terms</span><span>TrelloIsDead is an independent open-source project, not affiliated with Atlassian or Trello. Source: github.com/tommy-muckstack/trelloisdead</span><span className="soc">{[0, 1, 2, 3, 4].map(i => <i key={i} />)}</span></div></footer>;
}
export function TrHome() {
  return <div className="tr pk">
    <TrNav />
    <div className="tr-ban">Accelerate your teams&apos; work with AI features 🤖 now available for all Premium and Enterprise! <u>Learn more.</u></div>
    <section className="tr-hero"><div className="l"><h1>Capture, organize, and tackle your to-dos from anywhere.</h1><p>Escape the clutter and chaos—unleash your productivity with TrelloIsDead.</p>
      <form className="em" action="/login"><input placeholder="Email" aria-label="Email" /><Link href="/login" className="bt">Sign up - it&apos;s free!</Link></form>
      <p className="ack">By entering my email, I acknowledge the <a>Atlassian Privacy Policy</a></p><p className="vid">Watch video <i>▶</i></p></div>
      <div className="r"><i className="o" /><i className="p" /><div className="ph"><div className="sc"><b>Inbox</b>{[1, 2, 3, 4].map(i => <u key={i} />)}</div></div><i className="ic a" /><i className="ic b" /><i className="ic c" /></div></section>
    <section className="tr-101"><small>TRELLO 101</small><h3>Stay organized and efficient with Inbox, Boards, and Planner. Every to-do, idea, or responsibility—no matter how small—finds its place, keeping you at the top of your game.</h3><div className="dots"><i /><i /><i /></div>
      <div className="tabs"><div className="t on"><b>Inbox</b><span>When it&apos;s on your mind, it goes in your Inbox. Capture your to-dos from anywhere, anytime.</span></div><div className="t"><b>Boards</b><span>Your to-do list may be long, but it can be manageable! Keep tabs on everything from &quot;to-dos to tackle&quot; to &quot;mission accomplished!&quot;</span></div><div className="t"><b>Planner</b><span>Drag, drop, get it done. Snap your top tasks into your calendar and make time for what truly matters.</span></div>
        <div className="img"><i className="c1">Inbox</i><i className="c2">Personal Task Board</i><div className="c3" /></div></div></section>
    <section className="tr-act"><h2>From message to action</h2><p>Quickly turn communication from your favorite apps into to-dos, keeping all your discussions and tasks organized in one place.</p>
      <div className="cd a"><div className="im"><i /><i /></div><div className="tx"><small>EMAIL MAGIC</small><p>Easily turn your emails into to-dos! Just forward them to your Trello Inbox, and they&apos;ll be transformed by AI into organized to-dos with all the links you need.</p></div></div>
      <div className="cd b"><div className="tx"><small>MESSAGE APP SORCERY</small><p>Need to follow up on a message from Slack or Microsoft Teams? Send it directly to your Trello board! Your favorite app interface lets you save messages that appear in your Trello Inbox as AI-generated summaries and links.</p></div><div className="im"><i /></div></div></section>
    <section className="tr-ws"><small>WORK SMARTER</small><h3>Customize the way you organize with easy integrations, automation, and mirroring of your to-dos across multiple locations.</h3>
      <div className="g3">{[["Integrations", "Connect the apps you are already using into your Trello workflow or add a Power-Up to fine-tune your specific needs.", "Browse Integrations"], ["Automation", "No-code automation is built into every Trello board. Focus on the work that matters most and let the robots do the rest.", "Get to know Automation"], ["Card mirroring", "View all your to-dos from multiple boards in one place. Mirror a card to keep track of work wherever you need it!", "Compare plans"]].map(([t, d, b], i) => <div key={t}><i className={"g" + i} /><h4>{t}</h4><p>{d}</p><a>{b}</a></div>)}</div>
      <div className="dots2"><i /><i /><i /><b>‹</b><b>›</b></div>
      <div className="tm"><div className="a"><p>[Trello is] great for simplifying complex processes. As a manager, I can chunk [processes] down into bite-sized pieces for my team and then delegate out to the rest.</p><small>Joey Rosenberg<br />Global Leadership Director at Women Who Code</small><u>Read the story</u></div><div className="b"><h4>75% of organizations report that Trello delivers value to their business within 30 days.</h4><small>Trello TechValidate Survey</small></div></div>
      <p className="cm">Join a community of millions of users globally who are using Trello to get more done.</p><div className="lg">{["VISA", "coinbase", "JOHN DEERE", "zoom", "GRAND HYATT", "Fender"].map(l => <b key={l}>{l}</b>)}</div></section>
    <section className="tr-end"><h2>Get started with Trello today</h2><form className="em"><input placeholder="Email" aria-label="Email" /><Link href="/login" className="bt">Sign up - it&apos;s free!</Link></form><p>By entering my email, I acknowledge the <a>Atlassian Privacy Policy</a></p></section>
    <TrFoot />
  </div>;
}
