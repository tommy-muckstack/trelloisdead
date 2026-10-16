// TrelloIsDead brand mark: the IsDead tombstone (shared silhouette with the other clones) on a blue tile. Original art.
export const BRAND = { blue: "#0C66E4", ink: "#FFFFFF" };
export function Mark({ size = 28, rounded = true }: { size?: number; rounded?: boolean }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ flex: "none" }}>
    <rect width="32" height="32" rx={rounded ? 7 : 0} fill={BRAND.blue} />
    <g fill={BRAND.ink}><path d="M16 5.5a8 8 0 0 1 8 8V24H8V13.5a8 8 0 0 1 8-8z" /><rect x="5" y="23" width="22" height="4.5" rx="1.6" /></g>
    <path d="M12.2 11.8l7.6 7.6M19.8 11.8l-7.6 7.6" stroke={BRAND.blue} strokeWidth="2.6" strokeLinecap="round" fill="none" />
  </svg>;
}
/** Mark + wordmark. `tone` picks the text colour for light or dark backgrounds. */
export function Wordmark({ size = 24, tone = "dark" }: { size?: number; tone?: "dark" | "light" }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: Math.round(size * 0.3), fontFamily: "var(--ids-font-display)", fontWeight: 800, fontSize: Math.round(size * 0.78), letterSpacing: "-0.02em", color: tone === "light" ? "#fff" : "inherit", lineHeight: 1 }}>
    <Mark size={size} />TrelloIsDead</span>;
}
