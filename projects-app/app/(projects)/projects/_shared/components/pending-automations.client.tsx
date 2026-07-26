"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, X } from "lucide-react";
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
/** A build takes a minute or two. An hour is generous; past it the entry is residue, not progress. */
const MAX_AGE_MS = 60 * 60 * 1000;

export type PendingDetail = { automation: string; category: string; slug: string; title: string; url: string };
/** `at` = when the creation was registered (owner 2026-07-20) — absent on entries stored before the expiry
 *  guard existed; those are kept until the mount probe rules on them. */
type Entry = PendingDetail & { ready: boolean; at?: number };

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

  // Load any survivors from a reload, minus the ones the server grid now lists — then VERIFY them.
  //
  // ⚠ THE IMMORTAL DEAD CARD (owner 2026-07-20). This list lives in the browser, and an entry was only ever
  // dropped when the server grid listed its slug. So an automation that never materialised — a creation that
  // failed, or one deleted afterwards — left a card that no reload could remove, pointing at a URL that 404s.
  // The owner saw "Готово — открыть" on a page that does not exist, and had no way to dismiss it.
  //
  // Two guards, both client-side because the residue is client-side:
  //   1. VERIFY ON MOUNT — every survivor (ready ones included) is probed once; a 404 means the automation is
  //      gone, and the card goes with it. This is what heals the cards already stuck in owners' browsers.
  //   2. EXPIRY — an entry older than MAX_AGE_MS is dropped regardless. A build takes a minute or two; a
  //      card still "building" an hour later is not building, it is dead.
  useEffect(() => {
    const have = new Set(existingSlugs);
    const fresh = Date.now() - MAX_AGE_MS;
    const survivors = loadStored(category)
      // Drop an entry ONLY when the grid ALREADY lists it AND it is READY — i.e. the real card exists and
      // works (step 301, the double-card fix). A BUILDING entry is kept even if the folder scan already
      // listed it: its route is not compiled yet, so its spinner must stay (and it hides the not-yet-ready
      // real card below). Dropping it here was what left the broken real card and killed the spinner.
      .filter((e) => !(have.has(e.slug) && e.ready))
      .filter((e) => !e.at || e.at > fresh);
    setEntries(survivors);
    store(category, survivors);

    if (survivors.length === 0) return;
    let cancelled = false;
    void (async () => {
      const alive = await Promise.all(
        survivors.map(async (e) => {
          try {
            const r = await fetch(e.url, { method: "GET", cache: "no-store", redirect: "manual" });
            // 404 = the automation does not exist. Anything else (including a still-building route or a
            // redirect to auth) keeps the card: only a definite "not there" is grounds for removal.
            return r.status === 404 ? null : e.slug;
          } catch { return e.slug; } // network hiccup — never delete a card on a guess
        }),
      );
      if (cancelled) return;
      const keep = new Set(alive.filter(Boolean) as string[]);
      if (keep.size === survivors.length) return;
      setEntries((prev) => {
        const next = prev.filter((e) => keep.has(e.slug));
        store(category, next);
        return next;
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  /** Manual dismissal — the owner should never need us to ship a fix to get rid of a card. */
  const dismiss = (slug: string) =>
    setEntries((prev) => {
      const next = prev.filter((e) => e.slug !== slug);
      store(category, next);
      return next;
    });

  // Listen for new creations in this category.
  useEffect(() => {
    const onPending = (ev: Event) => {
      const d = (ev as CustomEvent<PendingDetail>).detail;
      if (!d || d.category !== category) return;
      setEntries((prev) => {
        // Add the spinner even if the folder scan already lists the slug: a just-created automation's route
        // is not built yet, so we WANT the spinner (it hides the not-ready real card). Only skip a true
        // duplicate of an existing pending entry.
        if (prev.some((e) => e.slug === d.slug)) return prev;
        const next = [...prev, { ...d, ready: false, at: Date.now() }];
        store(category, next);
        return next;
      });
    };
    window.addEventListener(EVENT, onPending as EventListener);
    return () => window.removeEventListener(EVENT, onPending as EventListener);
  }, [category]);

  // Once the grid catches up (a reload after the route is built), the READY spinner is dropped so the real
  // card takes over — building spinners are kept (see the mount filter). One card at every moment.
  useEffect(() => {
    const have = new Set(existingSlugs);
    setEntries((prev) => {
      const next = prev.filter((e) => !(e.ready && have.has(e.slug)));
      if (next.length !== prev.length) { store(category, next); return next; }
      return prev;
    });
  }, [existingSlugs, category]);

  // Poll the project URL: 404 while building OR after a delete, 200 once the rebuild has served it.
  //
  // ⚠ THE POLL WATCHES **EVERY** ENTRY, READY ONES INCLUDED (owner 2026-07-26, the ghost-after-delete bug).
  // The one-shot mount verify runs DURING the delete's rebuild window, when the old route still answers 2xx,
  // so it wrongly keeps the card; and it never re-checks. Now the poll re-probes ready cards too and DROPS
  // any that turn 404 — so a deleted automation's card heals itself within a cycle, without a reload. It runs
  // while ANY entry survives (not only while something is "building"), which is exactly what makes the ghost
  // removable. A real automation's card is short-lived here anyway: the hub reload folds it into the grid and
  // the mount de-dup drops it.
  useEffect(() => {
    if (entries.length === 0) return;
    const t = setInterval(async () => {
      const results = await Promise.all(
        entries.map(async (e) => {
          try {
            const r = await fetch(e.url, { method: "GET", cache: "no-store", redirect: "manual" });
            // A definite 404 = the automation is gone (deleted or never materialised) → drop it. Anything
            // else (2xx, a still-building route, a redirect to auth) means it exists → keep and, if it was a
            // spinner, light it up.
            if (r.status === 404) return { slug: e.slug, state: "gone" as const };
            return { slug: e.slug, state: "alive" as const };
          } catch { return { slug: e.slug, state: "alive" as const }; } // network/pm2 hiccup — never drop on a guess
        }),
      );
      const gone = new Set(results.filter((r) => r.state === "gone").map((r) => r.slug));
      setEntries((prev) => {
        const next = prev
          .filter((e) => !gone.has(e.slug)) // deleted / never-built → remove the ghost
          .map((e) => (e.ready ? e : { ...e, ready: true })); // survivors that were building are now served
        // Only touch storage if something actually changed (avoid a needless write every 8s).
        if (gone.size || prev.some((e) => !e.ready)) store(category, next);
        return next;
      });
    }, POLL_MS);
    return () => clearInterval(t);
  }, [entries, category]);

  if (entries.length === 0) return null;

  // Пока карточка СТРОИТСЯ, прячем её реальную карточку в сетке (если хаб её уже отсканировал): на экране —
  // только спиннер, без второй, сырой карточки, чей маршрут ещё 404. Слаги — `[a-z0-9-]`, в CSS-селекторе
  // безопасны. Как только карточка `ready`, её убирают из `entries` (эффекты выше) → правило исчезает.
  const buildingSlugs = entries.filter((e) => !e.ready).map((e) => e.slug);

  return (
    <>
      {buildingSlugs.length > 0 ? (
        <style>{buildingSlugs.map((s) => `[data-automation-card="${s}"]{display:none!important}`).join("")}</style>
      ) : null}
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
              <span className="flex shrink-0 items-center gap-1">
                {/* The escape hatch: inside a Link, so the click must not navigate. */}
                <button
                  type="button"
                  aria-label={L.pendingDismiss}
                  title={L.pendingDismiss}
                  onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); dismiss(e.slug); }}
                  className="rounded p-0.5 text-muted-foreground opacity-0 transition hover:bg-muted group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
                <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-0.5" />
              </span>
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
