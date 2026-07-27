"use client";

import { useEffect, useState } from "react";

// THE UI LANGUAGE of the admin/projects layer (owner's rule, CLAUDE.md 4г) — the ten languages we ship
// (en, es, fr, it, ru, de, pt, pl, tr, nl), anything else falls back to English.
//
// ⚠ TWO COPIES, ONE BEHAVIOUR (migration artifact): this `_shared-v2` hook and `_shared/use-ui-lang.ts` are
// separate modules with separate state, but they MUST agree — the footer selector lives in `_shared` and the
// dev-layer components (use-cases panel, welcome…) read THIS one. They stay in sync because both read the
// SAME localStorage key + listen to the SAME window event below. If only one is reactive, the footer switches
// but the panels don't (the exact bug this fixes, 2026-07-27).
//
// TWO SOURCES, override wins:
//   1. MANUAL OVERRIDE — the owner's pick from the zone-footer selector, in localStorage `fractera-ui-lang`.
//      Switching it broadcasts `fractera:ui-lang`; every consumer here re-renders instantly, no page reload.
//   2. SERVER DEFAULT — `/api/projects/language`, fetched once per page and memoized. Used until overridden.

const LS_KEY = "fractera-ui-lang";
const EVT = "fractera:ui-lang";

let fetchedDefault: string | null = null;
let inFlight: Promise<string> | null = null;

function readOverride(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(LS_KEY);
    if (v && /^[a-z]{2}$/.test(v)) return v;
  } catch {
    /* localStorage unavailable */
  }
  return null;
}

function fetchDefault(): Promise<string> {
  if (fetchedDefault) return Promise.resolve(fetchedDefault);
  if (!inFlight) {
    inFlight = fetch(`/api/projects/language`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { code?: string } | null) => {
        fetchedDefault = (d?.code ?? "en").toLowerCase().slice(0, 2);
        return fetchedDefault;
      })
      .catch(() => {
        fetchedDefault = "en";
        return fetchedDefault;
      });
  }
  return inFlight;
}

function currentLang(): string {
  return readOverride() ?? fetchedDefault ?? "en";
}

/** The two-letter UI-language code, reactive to the footer selector. English until the default is known. */
export function useUiLang(): string {
  // Deterministic initial state (no localStorage read in the initializer) so SSR HTML and the first client
  // render agree; the override is applied in the effect below.
  const [lang, setLang] = useState<string>(fetchedDefault ?? "en");
  useEffect(() => {
    let alive = true;
    const sync = () => {
      if (alive) setLang(currentLang());
    };
    if (readOverride()) {
      sync();
    } else {
      void fetchDefault().then(() => {
        if (alive && !readOverride()) setLang(currentLang());
      });
    }
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      alive = false;
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return lang;
}
