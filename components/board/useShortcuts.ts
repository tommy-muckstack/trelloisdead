"use client";
// Board keyboard shortcuts (Trello's set): selection with arrows / J K, and actions on the hovered or selected card.
import { useEffect, useRef, useState } from "react";
import { findCard } from "@/lib/model";
import { EMPTY_FILTER, type Filter } from "@/lib/filter";
import { useApp } from "@/components/app/AppProvider";
import { useBoard } from "@/components/app/BoardProvider";
import type { MenuView } from "@/components/board/BoardMenu";

type Opts = { filter: Filter; setFilter: (f: Filter) => void; setFilterOpen: (o: boolean) => void; menu: MenuView | null; setMenu: (m: MenuView | null) => void; onOpen: (id: string) => void; addAfter: (listId: string, cardId: string) => void; active: boolean };
export function useBoardShortcuts(o: Opts) {
  const app = useApp(); const { board, dispatch, me, editable, undo, redo, lastAction } = useBoard();
  const [sel, setSel] = useState<string | null>(null); const hover = useRef<string | null>(null); const ref = useRef(o); ref.current = o;
  useEffect(() => { const h = (e: MouseEvent) => { const el = (e.target as HTMLElement).closest?.("[data-card-id]") as HTMLElement | null; hover.current = el?.dataset.cardId ?? null; }; document.addEventListener("mouseover", h); return () => document.removeEventListener("mouseover", h); }, []);
  useEffect(() => {
    const visible = () => Array.from(document.querySelectorAll<HTMLElement>(".b-list[data-list-id]")).map(l => Array.from(l.querySelectorAll<HTMLElement>("[data-card-id]")).map(c => c.dataset.cardId!));
    const h = (e: KeyboardEvent) => {
      const x = ref.current; if (!x.active || !app.user.settings.shortcuts || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement; if (t.closest("input,textarea,select,[contenteditable=true]") || document.querySelector(".tr-scrim")) return;
      const k = e.key; const target = hover.current ?? sel; const hit = target ? findCard(board, target) : null; const card = hit?.card;
      const done = () => e.preventDefault();
      if (k === "f") { done(); x.setFilterOpen(true); return; }
      if (k === "x") { done(); x.setFilter(EMPTY_FILTER); return; }
      if (k === "q") { done(); x.setFilter({ ...x.filter, members: x.filter.members.includes("me") ? x.filter.members.filter(m => m !== "me") : [...x.filter.members, "me"] }); return; }
      if (k === "w") { done(); x.setMenu(x.menu ? null : "main"); return; }
      if (k === "z" && editable) { done(); undo(); return; } if (k === "Z" && editable) { done(); redo(); return; }
      if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "j", "k"].includes(k)) {
        done(); const cols = visible(); const flat = cols.flat(); if (!flat.length) return;
        if (!sel || !flat.includes(sel)) { setSel(flat[0]!); return; }
        const ci = cols.findIndex(c => c.includes(sel)); const ri = cols[ci]!.indexOf(sel);
        if (k === "ArrowDown" || k === "j") setSel(cols[ci]![Math.min(cols[ci]!.length - 1, ri + 1)]!); else if (k === "ArrowUp" || k === "k") setSel(cols[ci]![Math.max(0, ri - 1)]!);
        else { const step = k === "ArrowRight" ? 1 : -1; for (let n = ci + step; n >= 0 && n < cols.length; n += step) if (cols[n]!.length) { setSel(cols[n]![Math.min(cols[n]!.length - 1, ri)]!); break; } }
        return;
      }
      if (k === "Enter" && sel) { done(); x.onOpen(sel); return; }
      if (!card || !hit) return;
      if (k === "e") { done(); x.onOpen(card.id); return; }
      if (k === "t") { done(); x.onOpen(card.id); setTimeout(() => (document.querySelector(".c-modal [aria-label='Card title']") as HTMLTextAreaElement | null)?.focus(), 120); return; }
      if (!editable) return;
      if (k === "n") { done(); x.addAfter(hit.list.id, card.id); return; }
      if (k === " ") { done(); dispatch({ t: "card.member", cardId: card.id, userId: me, on: !card.members.includes(me) }); return; }
      if (/^[1-9]$/.test(k)) { const l = board.labels[Number(k) - 1]; if (l) { done(); dispatch({ t: "card.label", cardId: card.id, labelId: l.id, on: !card.labels.includes(l.id) }); } return; }
      if (k === "c") { done(); dispatch({ t: "card.patch", cardId: card.id, patch: { archived: true } }); app.toast(`Archived “${card.title}”.`, { action: { label: "Undo", run: () => dispatch({ t: "card.patch", cardId: card.id, patch: { archived: false } }) } }); return; }
      if (k === "s") { done(); dispatch({ t: "card.watch", cardId: card.id, on: !card.watchers.includes(me) }); return; }
      if (k === "v" && board.powerUps.includes("voting")) { done(); dispatch({ t: "card.vote", cardId: card.id, on: !card.votes.includes(me) }); return; }
      if (k === "," || k === "." || k === "<" || k === ">") {
        const lists = board.lists.filter(l => !l.archived); const i = lists.findIndex(l => l.id === hit.list.id); const to = lists[i + (k === "," || k === "<" ? -1 : 1)];
        if (to) { done(); dispatch({ t: "card.move", cardId: card.id, listId: to.id, index: 0 }); } return;
      }
      if (k === "r" && lastAction) {
        const la = lastAction; done();
        if (la.t === "card.label") dispatch({ ...la, cardId: card.id, on: !card.labels.includes(la.labelId) });
        else if (la.t === "card.member") dispatch({ ...la, cardId: card.id, on: !card.members.includes(la.userId) });
        else if (la.t === "card.move") dispatch({ ...la, cardId: card.id, index: 0 });
        else if (la.t === "card.patch" && la.patch.dueComplete !== undefined) dispatch({ t: "card.patch", cardId: card.id, patch: { dueComplete: la.patch.dueComplete } });
      }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [app, board, dispatch, me, editable, undo, redo, lastAction, sel]);
  useEffect(() => { if (sel) document.querySelector(`.b-card.sel`)?.scrollIntoView({ block: "nearest", inline: "nearest" }); }, [sel]);
  return { sel, setSel };
}
