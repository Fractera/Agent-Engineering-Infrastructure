// Static, build-time dictionary for the Fractera Admin control panel (:3002).
//
// The words themselves live in admin-translations.json next to this file, NOT
// in TypeScript. That split is deliberate (step 500, task 13): translations are
// produced outside the repo by a translation model and dropped in as one file,
// so nobody has to hand-edit a 5000-line source file to add a language.
//
// Everything is still STATIC: the JSON is bundled at build time, there is no
// per-request work and no runtime translation call. A client component reads
// the BROWSER language once (navigator.language) and picks the matching entry,
// so every page that could be static stays static — reading Accept-Language on
// the server would force the whole subtree dynamic, which we refuse.
//
// Language list mirrors the auth layer's 82 (this overrides rule 4г's "ten
// languages for admin layers").
//
// Never translated: product names (Fractera, OpenAI, PM2, Neon, GitHub), role
// ids, env var names, slugs and enum values.

import translations from "./admin-translations.json";

export type AdminStrings = {
  // header
  notSecure: string;
  notSecureTooltip: string;
  preview: string;
  signIn: string;
  menu: string;
  // account footer of the settings drawer
  signOut: string;
  registerAccount: string;
};

export const DEFAULT_ADMIN_LANG = "en";

export const STRINGS = translations as Record<string, Partial<AdminStrings>>;

const BASE = STRINGS[DEFAULT_ADMIN_LANG] as AdminStrings;

// Resolve a language to its strings. The English entry is spread underneath, so
// a language the translation file covers only partially renders English for the
// missing keys instead of `undefined` — the file arrives from outside the repo,
// so a partial entry must degrade, never blank the UI.
export function getAdminStrings(lang: string): AdminStrings {
  const entry = STRINGS[lang];
  return entry ? { ...BASE, ...entry } : BASE;
}

// Browser-language detector for client components. Reads navigator.language
// (e.g. "pt-BR" → "pt"), returns the matching bundled language or English.
export function detectBrowserLang(): string {
  if (typeof navigator === "undefined") return DEFAULT_ADMIN_LANG;
  const candidates = [navigator.language, ...(navigator.languages ?? [])];
  for (const c of candidates) {
    if (!c) continue;
    const primary = c.toLowerCase().split("-")[0];
    if (STRINGS[primary]) return primary;
  }
  return DEFAULT_ADMIN_LANG;
}

// Simple placeholder substitution: fill(s.someString, { name }).
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}
