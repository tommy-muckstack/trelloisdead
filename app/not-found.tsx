import Link from "next/link";
import { TrNav, TrFoot } from "@/components/marketing/Chrome";
import "@/components/pk.css";
import "@/components/trhome.css";
import "@/components/trhome-m.css";
import "@/components/marketing/marketing.css";
export const metadata = { title: "Page not found | TrelloIsDead" };
// Branded 404, like Trello's: the page may exist but be private.
export default function NotFound() {
  return <div className="tr pk"><TrNav /><main className="mk-page" style={{ textAlign: "center", minHeight: "52vh" }} data-testid="not-found">
    <h1>Page not found.</h1>
    <p className="lede" style={{ maxWidth: 620, margin: "0 auto 28px" }}>This page may be private. If someone gave you this link, you may need to be a board or Workspace member to access it.</p>
    <p style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}><Link className="mk-btn" href="/app">Go to your boards</Link><Link className="mk-btn ghost" href="/login">Log in</Link><Link className="mk-btn ghost" href="/">Home</Link></p>
  </main><TrFoot /></div>;
}
