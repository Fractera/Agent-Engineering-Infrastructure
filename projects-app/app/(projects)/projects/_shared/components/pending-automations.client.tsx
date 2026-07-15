"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { useUiLang } from "../use-ui-lang";
import { createAutomationStrings } from "../create-automation-i18n";

// THE OPTIMISTIC PENDING CARD (step 242.3, owner) — closes the gap between "create an automation" and "its
// card appears". The category hub grid is STATICALLY prerendered, so a freshly created project does NOT show
// until the background rebuild regenerates the static page AND the owner hard-reloads. Before this, the
// creation dialog just closed and nothing happened — the page seemed to vanish.
//
// Now, the instant an automation is created, the dialog dispatches a window event and THIS client component —
// mounted inside the grid — renders a muted card with a spinner and the automation's name. It then polls the
// project's own URL (HEAD): 404 while the route is still building, 200 once the rebuild has served it. On 200
// the card lights up into a real, clickable link — no reload, no manual refresh. The civilized path the owner
// asked for; the timer is only the readiness probe, never a blind "reload after N seconds".
//
// PERSISTENCE: the pending list is mirrored to localStorage (per category), so if the owner reloads WHILE the
// page is still building, the spinner card survives the reload and keeps polling. DE-DUPLICATION: an entry is
// dropped the moment the server grid already lists its slug (a rebuild folded it in), so a card is never shown
// twice.

const EVENT = "fractera:automation-pending";
const POLL_MS = 8000;

export type PendingDetail = { automation: string; category: string; slug: string; title: string; url: string };
type Entry = PendingDetail & { ready: boolean };

const lsKey = (category: string) => `pending-automations:${category}`;

function loadStored(category: string): Entry[] {
  try {
    const raw = localStorage.getItem(lsKey(category));
    const arr = raw ? (JSON.parse(raw) as Entry[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function store(category: string, entries: Entry[]) {
  try { localStorage.setItem(lsKey(category), JSON.stringify(entries)); } catch { /* quota/private mode — in-memory still works */ }
}

/** Rendered inside a category hub grid, after the real cards and before the "+" card. `existingSlugs` are the
 *  project slugs the SERVER already rendered — an entry matching one of them is dropped (the grid caught up). */
export function PendingAutomations({ category, existingSlugs }: { category: string; existingSlugs: string[] }) {
  const L = createAutomationStrings(useUiLang());
  const [entries, setEntries] = useState<Entry[]>([]);

  // Load any survivors from a reload, minus the ones the server grid now lists.
  useEffect(() => {
    const have = new Set(existingSlugs);
    const initial = loadStored(category).filter((e) => !have.has(e.slug));
    setEntries(initial);
    store(category, initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Listen for new creations in this category.
  useEffect(() => {
    const onPending = (ev: Event) => {
      const d = (ev as CustomEvent<PendingDetail>).detail;
      if (!d || d.category !== category) return;
      setEntries((prev) => {
        if (prev.some((e) => e.slug === d.slug) || existingSlugs.includes(d.slug)) return prev;
        const next = [...prev, { ...d, ready: false }];
        store(category, next);
        return next;
      });
    };
    window.addEventListener(EVENT, onPending as EventListener);
    return () => window.removeEventListener(EVENT, onPending as EventListener);
  }, [category, existingSlugs]);

  // Poll readiness: a HEAD to the project URL is 404 while building, 200 once the rebuild has served it.
  useEffect(() => {
    if (entries.length === 0 || entries.every((e) => e.ready)) return;
    const t = setInterval(async () => {
      const building = entries.filter((e) => !e.ready);
      const results = await Promise.all(
        building.map(async (e) => {
          try {
            // GET (not HEAD): a page route reliably answers GET through the proxy; 404 while the route is
            // still building, 200 once the rebuild has served it. no-store so a poll never reads a cache.
            const r = await fetch(e.url, { method: "GET", cache: "no-store", redirect: "manual" });
            return { slug: e.slug, ready: r.ok || r.status === 0 || (r.status >= 200 && r.status < 400) };
          } catch { return { slug: e.slug, ready: false }; } // pm2 reload window → still building
        }),
      );
      const nowReady = new Set(results.filter((r) => r.ready).map((r) => r.slug));
      if (nowReady.size) {
        setEntries((prev) => {
          const next = prev.map((e) => (nowReady.has(e.slug) ? { ...e, ready: true } : e));
          store(category, next);
          return next;
        });
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [entries, category]);

  if (entries.length === 0) return null;

  return (
    <>
      {entries.map((e) =>
        e.ready ? (
          // Lit up — a real card, now a link. Same shape as a hub card.
          <Link
            key={e.slug}
            href={e.url}
            className="group flex flex-col rounded-xl border border-primary/40 bg-card p-5 shadow-sm transition-all hover:border-primary/60 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-tight">{e.title || e.slug}</h3>
              <ArrowRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-2 text-sm text-primary">{L.pendingReady}</p>
          </Link>
        ) : (
          // Building — muted, non-clickable, with a spinner (the owner's picture).
          <div
            key={e.slug}
            className="flex flex-col rounded-xl border border-dashed bg-muted/30 p-5 opacity-70"
            aria-busy="true"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-tight text-muted-foreground">{e.title || e.slug}</h3>
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{L.pendingBuilding}</p>
          </div>
        ),
      )}
    </>
  );
}

/** Fire-and-forget: the creation dialog calls this on success so the pending card appears at once. */
export function announcePendingAutomation(detail: PendingDetail) {
  window.dispatchEvent(new CustomEvent<PendingDetail>(EVENT, { detail }));
}
