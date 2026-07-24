"use client";

import { useEffect, useState } from "react";

// THE UI LANGUAGE of the admin/projects layer (owner's rule, CLAUDE.md 4г) — the ten languages we ship
// (en, es, fr, it, ru, de, pt, pl, tr, nl), anything else falls back to English. One shared hook so every
// component reads the SAME language without each mounting its own fetch: the default locale is fetched once
// per page and memoized at module scope.
//
// It returns the two-letter code; a component pairs it with its own ten-language dictionary:
//   const lang = useUiLang(); const L = MY_I18N[lang] ?? MY_I18N.en;

let cached: string | null = null;
let inFlight: Promise<string> | null = null;

function fetchLang(): Promise<string> {
  if (cached) return Promise.resolve(cached);
  if (!inFlight) {
    inFlight = fetch(`/api/projects/language`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { code?: string } | null) => {
        cached = (d?.code ?? "en").toLowerCase().slice(0, 2);
        return cached;
      })
      .catch(() => {
        cached = "en";
        return cached;
      });
  }
  return inFlight;
}

/** The two-letter default-locale code, English until it is known. Shared + memoized across the page. */
export function useUiLang(): string {
  const [lang, setLang] = useState<string>(cached ?? "en");
  useEffect(() => {
    let alive = true;
    void fetchLang().then((c) => { if (alive) setLang(c); });
    return () => { alive = false; };
  }, []);
  return lang;
}
