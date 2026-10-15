"use client";
export function PlanToggle() {
  return <button type="button" className="tgl" onClick={e => { const c = e.currentTarget.closest(".pl"); if (!c) return; const o = c.classList.toggle("open"); e.currentTarget.textContent = o ? "Hide what's included" : "See what's included"; }}>See what&apos;s included</button>;
}
