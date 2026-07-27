"use client";

import { useEffect, useState } from "react";
import { UI_LANGS } from "./ui-langs";

// THE UI LANGUAGE of the admin/projects layer (owner's rule, CLAUDE.md 4г) — the ten languages we ship
// (en, es, fr, it, ru, de, pt, pl, tr, nl), anything else falls back to English. One shared hook so every
// component reads the SAME language without each mounting its own fetch.
//
// TWO SOURCES, override wins (footer language selector, 2026-07-27):
//   1. MANUAL OVERRIDE — the owner's pick from the zone-footer dropdown, kept in localStorage. When set,
//      it beats the server default. Switching it broadcasts an event so EVERY `useUiLang()` consumer
//      re-renders in the new language WITHOUT a page reload (owner's requirement).
//   2. SERVER DEFAULT — `/api/projects/language` (first of NEXT_PUBLIC_SUPPORTED_LANGUAGES, English if unset),
//      fetched once per page and memoized at module scope. Used until/unless the owner overrides.
//
// It returns the two-letter code; a component pairs it with its own ten-language dictionary:
//   const lang = useUiLang(); const L = MY_I18N[lang] ?? MY_I18N.en;

const LS_KEY = "fractera-ui-lang";
const EVT = "fractera:ui-lang";

let fetchedDefault: string | null = null; // server default, memoized across the page
let inFlight: Promise<string> | null = null;

/** The manual override from localStorage, or null. Only the ten shipped languages are honoured. */
function readOverride(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(LS_KEY);
    if (v && (UI_LANGS as readonly string[]).includes(v)) return v;
  } catch {
    /* localStorage unavailable — no override */
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

/** The current UI language: manual override if set, else the memoized server default, else English. */
function currentLang(): string {
  return readOverride() ?? fetchedDefault ?? "en";
}

/**
 * Set the manual UI-language override for the WHOLE cockpit. Three writes so BOTH the client and the server
 * follow the pick with no page reload:
 *   1. localStorage — survives navigation/reload for the pure-client `useUiLang()` consumers.
 *   2. a cookie — the SERVER reads it (each automation's `page.tsx` is the single platform read point,
 *      закон 0) so server-rendered text (welcome, section titles, tabs) re-renders in the chosen language
 *      after `router.refresh()`.
 *   3. a broadcast event — every mounted `useUiLang()` re-renders instantly in this tab.
 * The selector pairs this with `router.refresh()` to re-run the server tree against the new cookie.
 */
export function setUiLang(code: string): void {
  const c = code.toLowerCase().slice(0, 2);
  try {
    window.localStorage.setItem(LS_KEY, c);
  } catch {
    /* ignore — the cookie + event below still switch this session */
  }
  // Cookie for the SERVER read point. One year, path=/ (the whole zone), Lax (same-site nav only).
  document.cookie = `${LS_KEY}=${c}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new CustomEvent(EVT, { detail: c }));
}

/** The current override (or null) — for the selector to show the active choice. Client-only. */
export function readUiLangOverride(): string | null {
  return readOverride();
}

/** The two-letter UI-language code, reactive to the footer selector. English until the default is known. */
export function useUiLang(): string {
  // Initial state is deterministic ("en" or the already-fetched default) — the override is applied in the
  // effect below, NOT in the initializer, so server HTML and first client render match (no hydration jump).
  const [lang, setLang] = useState<string>(fetchedDefault ?? "en");
  useEffect(() => {
    let alive = true;
    const sync = () => {
      if (alive) setLang(currentLang());
    };
    // Apply an existing override immediately; if none, fetch the server default and adopt it (unless the
    // owner picks an override in the meantime).
    if (readOverride()) {
      sync();
    } else {
      void fetchDefault().then(() => {
        if (alive && !readOverride()) setLang(currentLang());
      });
    }
    window.addEventListener(EVT, sync); // same-tab switch from the footer
    window.addEventListener("storage", sync); // another tab switched — follow it
    return () => {
      alive = false;
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return lang;
}
