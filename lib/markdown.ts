// Small, safe Markdown renderer for card descriptions and comments. Everything is HTML-escaped first, then a
// limited set of constructs is turned back into tags: headings, bold, italic, strike, inline code, code blocks,
// links (http/https/mailto only), bullet/numbered/task lists, quotes, rules and @mentions.
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
function inline(s: string, mentions: Set<string>): string {
  const codes: string[] = [];
  let t = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  t = t.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g, (_, label, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`);
  t = t.replace(/(^|[\s(])((?:https?:\/\/)[^\s<)]+)/g, (_, pre, url) => `${pre}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>").replace(/(^|\W)_([^_\s][^_]*)_(?=\W|$)/g, "$1<em>$2</em>").replace(/~~([^~]+)~~/g, "<del>$1</del>");
  t = t.replace(/(^|\s)@([a-z0-9_]{2,24})\b/gi, (m, pre, u) => (mentions.has(u.toLowerCase()) ? `${pre}<span class="md-mention">@${u}</span>` : m));
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
}
export function renderMarkdown(src: string, usernames: string[] = []): string {
  const mentions = new Set(usernames.map(u => u.toLowerCase()));
  const lines = esc(src.replace(/\r\n?/g, "\n")).split("\n"); const out: string[] = []; let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (/^```/.test(line)) { const buf: string[] = []; i++; while (i < lines.length && !/^```/.test(lines[i]!)) buf.push(lines[i++]!); i++; out.push(`<pre><code>${buf.join("\n")}</code></pre>`); continue; }
    const h = line.match(/^(#{1,3})\s+(.*)$/); if (h) { const n = h[1]!.length + 2; out.push(`<h${n}>${inline(h[2]!, mentions)}</h${n}>`); i++; continue; }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) { out.push("<hr>"); i++; continue; }
    if (/^&gt;\s?/.test(line)) { const buf: string[] = []; while (i < lines.length && /^&gt;\s?/.test(lines[i]!)) buf.push(inline(lines[i++]!.replace(/^&gt;\s?/, ""), mentions)); out.push(`<blockquote>${buf.join("<br>")}</blockquote>`); continue; }
    if (/^\s*[-*+]\s+/.test(line)) { const buf: string[] = []; while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i]!)) { const item = lines[i++]!.replace(/^\s*[-*+]\s+/, ""); const task = item.match(/^\[( |x)\]\s+(.*)$/i); buf.push(task ? `<li class="md-task"><input type="checkbox" disabled${task[1]!.toLowerCase() === "x" ? " checked" : ""}> ${inline(task[2]!, mentions)}</li>` : `<li>${inline(item, mentions)}</li>`); } out.push(`<ul>${buf.join("")}</ul>`); continue; }
    if (/^\s*\d+[.)]\s+/.test(line)) { const buf: string[] = []; while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i]!)) buf.push(`<li>${inline(lines[i++]!.replace(/^\s*\d+[.)]\s+/, ""), mentions)}</li>`); out.push(`<ol>${buf.join("")}</ol>`); continue; }
    if (!line.trim()) { i++; continue; }
    const buf: string[] = []; while (i < lines.length && lines[i]!.trim() && !/^(```|#{1,3}\s|&gt;|\s*[-*+]\s|\s*\d+[.)]\s|-{3,}\s*$)/.test(lines[i]!)) buf.push(inline(lines[i++]!, mentions));
    out.push(`<p>${buf.join("<br>")}</p>`);
  }
  return out.join("");
}
/** Usernames mentioned in a comment (matched against board members by the caller). */
export const mentionsIn = (text: string) => [...text.matchAll(/(?:^|\s)@([a-z0-9_]{2,24})\b/gi)].map(m => m[1]!.toLowerCase());
