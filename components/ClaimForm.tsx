"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
// Trello-style hero sign-up: an email field that hands off to /login (prefilled via ?email=).
export function ClaimForm({ placeholder, cta }: { prefix?: string; placeholder: string; cta: string }) {
  const r = useRouter(); const [e, setE] = useState("");
  return <form className="mk-claim" onSubmit={ev => { ev.preventDefault(); r.push(`/login?callbackUrl=${encodeURIComponent("/app")}`); }}>
    <input aria-label="Email" type="email" className="mk-claim__in" value={e} onChange={x => setE(x.target.value)} placeholder={placeholder} />
    <button className="ids-btn ids-btn--primary">{cta}</button></form>;
}
