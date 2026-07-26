"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useUiLang } from "../use-ui-lang";
import { createAutomationStrings } from "../create-automation-i18n";

// THE OPTIMISTIC PENDING CARD (step 242.3, owner) — closes the gap between "create an automation" and "its
// card appears". A freshly created automation is a REAL folder cloned on disk, but its page is a COMPILED
// static route, so it does NOT show and 404s on click until the background rebuild (~1-2 min) regenerates
// the app. The instant an automation is created, the dialog dispatches a window event and THIS client
// component — mounted inside the grid — renders a muted spinner card with the automation's name and holds it
// there until the build TRULY finishes.
//
// ⚠ THE ONE ROOT CAUSE THIS FILE EXISTS TO GET RIGHT (owner, step 301, fixed for good 2026-07-26).
// A building route and a DELETED automation return the EXACT SAME 404. The old poll read 404 as "gone" and
// dropped the card — so a card that was merely still building vanished after the first poll (a few seconds),
// the owner reloaded, and the stale folder-scan grid then showed a clickable card whose route still 404'd.
// TWO symptoms, ONE cause: 404 alone cannot tell "building" from "gone".
//
// THE FIX: 404 NEVER drops a card on its own. On a 404 we ask the server GET /api/projects/exists — does the
// automation's FOLDER still exist on disk (written at creation, unaffected by the compiled-route rebuild)?
//   • folder exists → STILL BUILDING → keep the spinner (this is what stops the disappearance).
//   • folder gone   → truly GONE (deleted, or a creation that rolled back) → drop the card.
// READY is only ever declared when the route itself serves (status ≠ 404) — the card becomes clickable only
// then, so a click can never 404. On the building→ready transition we raise a SUCCESS toast; on a failure
// (folder gone while still building, or a build that never lands within FAIL_AFTER_MS) an ERROR toast + a
// dismissible failed card. Exactly the owner's contract: the spinner holds until success OR error, a toast
// announces which, and only then does the card change its design.
//
// PERSISTENCE: the pending list is mirrored to localStorage (per category), so a reload mid-build keeps the
// spinner and its polling. DE-DUPLICATION: a READY entry is dropped the moment the server grid already lists
// its slug (a rebuild folded the real card in), so a card is never shown twice.

const EVENT = "fractera:automation-pending";
const POLL_MS = 8000;
/** A build takes a minute or two. An hour is generous; past it the entry is residue, not progress. */
const MAX_AGE_MS = 60 * 60 * 1000;
/** A build that has not served the route after this long has failed (or is stuck) — surface an error. The
 *  poll keeps probing afterwards, so a genuinely slow build still heals into a ready card if it lands. */
const FAIL_AFTER_MS = 5 * 60 * 1000;

export type PendingDetail = { automation: string; category: string; slug: string; title: string; url: string };
/** `at` = when the creation was registered (owner 2026-07-20). `failed` = the build did not land in time or
 *  the folder vanished mid-build (owner 2026-07-26) — a dismissible error card, still polled for self-heal. */
type Entry = PendingDetail & { ready: boolean; at?: number; failed?: boolean };
/** What a single probe concluded about one entry's real state on the server. */
type Phase = "ready" | "building" | "gone";

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

// The single source of truth for one entry's state. NEVER concludes "gone" on a guess: a network hiccup on
// either fetch, or an uncertain exists-probe, keeps the card ("building"). Only the route serving (≠404) is
// "ready"; only a definite folder-absent verdict is "gone".
async function probeEntry(e: Entry): Promise<Phase> {
  let routeStatus: number;
  try {
    const r = await fetch(e.url, { method: "GET", cache: "no-store", redirect: "manual" });
    routeStatus = r.status;
  } catch {
    return "building"; // route unreachable (pm2 reload window etc.) — never drop on a guess
  }
  if (routeStatus !== 404) return "ready"; // 2xx/3xx → compiled route serves → live & clickable
  // 404 is ambiguous — still compiling, or the folder is gone. Ask the server which.
  try {
    const x = await fetch(`/api/projects/exists?automation=${encodeURIComponent(`${e.category}/${e.slug}`)}`, { cache: "no-store" });
    if (!x.ok) return "building"; // uncertain → keep the spinner
    const { exists } = (await x.json()) as { exists?: boolean };
    return exists ? "building" : "gone";
  } catch {
    return "building"; // uncertain → keep the spinner
  }
}

/** Rendered inside a category hub grid, after the real cards and before the "+" card. `existingSlugs` are the
 *  project slugs the SERVER already rendered — a READY entry matching one of them is dropped (the grid caught
 *  up and its real card takes over). */
export function PendingAutomations({ category, existingSlugs }: { category: string; existingSlugs: string[] }) {
  const L = createAutomationStrings(useUiLang());
  const [entries, setEntries] = useState<Entry[]>([]);
  // Toast-once guards (survive re-renders; reset only on a full remount). A slug in `doneToasted` already got
  // its success toast; in `failToasted`, its error toast. Prevents a repeat toast every 8s poll.
  const doneToasted = useRef<Set<string>>(new Set());
  const failToasted = useRef<Set<string>>(new Set());

  // Fold a batch of fresh probe verdicts into the entry list, raising success/error toasts on transitions.
  // Pure over refs + args; used by both the mount verify and the interval poll so the two never diverge.
  const applyPhases = (prev: Entry[], phaseBySlug: Map<string, Phase>): Entry[] => {
    const next: Entry[] = [];
    let changed = false;
    const now = Date.now();
    for (const e of prev) {
      const phase = phaseBySlug.get(e.slug);
      if (phase === "gone") {
        // Folder gone. If it never became ready, the CREATION failed → error toast (once). If it was already
        // ready, this is an ordinary delete elsewhere → remove silently.
        if (!e.ready && !failToasted.current.has(e.slug)) {
          failToasted.current.add(e.slug);
          toast.error(L.pendingFailedToast.replace("{title}", e.title || e.slug));
        }
        changed = true;
        continue; // drop
      }
      if (phase === "ready") {
        if (!e.ready) {
          changed = true;
          if (!doneToasted.current.has(e.slug)) {
            doneToasted.current.add(e.slug);
            toast.success(L.pendingDoneToast.replace("{title}", e.title || e.slug));
          }
          next.push({ ...e, ready: true, failed: false });
        } else {
          next.push(e);
        }
        continue;
      }
      // phase === "building" or unprobed this batch → still compiling. Flip to a FAILED card once the build
      // has clearly overrun, but keep the entry so the poll can still heal it if the route lands later.
      if (!e.ready && !e.failed && e.at && now - e.at > FAIL_AFTER_MS) {
        changed = true;
        if (!failToasted.current.has(e.slug)) {
          failToasted.current.add(e.slug);
          toast.error(L.pendingFailedToast.replace("{title}", e.title || e.slug));
        }
        next.push({ ...e, failed: true });
        continue;
      }
      next.push(e);
    }
    if (changed) store(category, next);
    return changed ? next : prev;
  };

  // Load any survivors from a reload, minus READY ones the server grid now lists — then VERIFY every survivor
  // once, promptly (the interval would otherwise wait a full cycle). Verification uses the same probe, so a
  // card stuck in an owner's browser (a creation that failed, or one deleted afterwards) heals here.
  useEffect(() => {
    const have = new Set(existingSlugs);
    const fresh = Date.now() - MAX_AGE_MS;
    const survivors = loadStored(category)
      // Drop a survivor ONLY when the grid already lists it AND it is READY — the real card exists and works.
      // A BUILDING entry is kept even if the folder scan already listed it: its route is not compiled yet, so
      // its spinner must stay (and it hides the not-yet-ready real card below).
      .filter((e) => !(have.has(e.slug) && e.ready))
      .filter((e) => !e.at || e.at > fresh);
    setEntries(survivors);
    store(category, survivors);

    if (survivors.length === 0) return;
    let cancelled = false;
    void (async () => {
      const results = await Promise.all(survivors.map(async (e) => [e.slug, await probeEntry(e)] as const));
      if (cancelled) return;
      setEntries((prev) => applyPhases(prev, new Map(results)));
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

  // Listen for new creations in this category → drop a fresh spinner in at once.
  useEffect(() => {
    const onPending = (ev: Event) => {
      const d = (ev as CustomEvent<PendingDetail>).detail;
      if (!d || d.category !== category) return;
      setEntries((prev) => {
        // Add the spinner even if the folder scan already lists the slug: a just-created automation's route
        // is not built yet, so we WANT the spinner (it hides the not-ready real card). Skip only a true dup.
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
  // card takes over. Building/failed spinners are kept (their routes are not served yet). One card always.
  useEffect(() => {
    const have = new Set(existingSlugs);
    setEntries((prev) => {
      const next = prev.filter((e) => !(e.ready && have.has(e.slug)));
      if (next.length !== prev.length) { store(category, next); return next; }
      return prev;
    });
  }, [existingSlugs, category]);

  // The heartbeat: probe every live entry every POLL_MS and fold the verdicts in. Building→ready lights the
  // card up (success toast); a gone folder or an overrun build raises the error toast (see applyPhases).
  useEffect(() => {
    if (entries.length === 0) return;
    let cancelled = false;
    const t = setInterval(async () => {
      const results = await Promise.all(entries.map(async (e) => [e.slug, await probeEntry(e)] as const));
      if (cancelled) return;
      setEntries((prev) => applyPhases(prev, new Map(results)));
    }, POLL_MS);
    return () => { cancelled = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, category]);

  if (entries.length === 0) return null;

  // Пока запись живёт в `entries`, ПРЯЧЕМ её реальную карточку в сетке (если хаб уже отсканировал папку):
  // на экране ровно одна карточка — наш спиннер/ошибка, а `ready` показывает нашу же ссылку. Прячем ВСЕ
  // слаги записей (не только строящиеся): если хаб динамический (ISR), при `ready` сырая карточка иначе
  // всплыла бы рядом с готовой ссылкой = две карточки. Как только запись уходит из `entries` (дедуп по
  // `existingSlugs` после перезагрузки или закрытие крестиком) — правило исчезает, и сетка отдаёт реальную
  // карточку сама. Слаги `[a-z0-9-]` — в CSS-селекторе безопасны.
  const hiddenSlugs = entries.map((e) => e.slug);

  return (
    <>
      {hiddenSlugs.length > 0 ? (
        <style>{hiddenSlugs.map((s) => `[data-automation-card="${s}"]{display:none!important}`).join("")}</style>
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
        ) : e.failed ? (
          // Failed — the build did not land in time (or the automation vanished mid-build). Non-clickable and
          // dismissible; the poll keeps probing, so if the route comes alive later this still heals into the
          // ready link above.
          <div
            key={e.slug}
            className="flex flex-col rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-tight text-destructive">{e.title || e.slug}</h3>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={L.pendingDismiss}
                  title={L.pendingDismiss}
                  onClick={() => dismiss(e.slug)}
                  className="rounded p-0.5 text-muted-foreground transition hover:bg-muted"
                >
                  <X className="size-3.5" />
                </button>
                <AlertTriangle className="size-4 shrink-0 text-destructive" />
              </span>
            </div>
            <p className="mt-2 text-sm text-destructive">{L.pendingFailed}</p>
          </div>
        ) : (
          // Building — muted, non-clickable, with a spinner (the owner's picture). Holds until success/error.
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
