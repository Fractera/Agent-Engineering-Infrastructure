// Static, build-time dictionary for the Fractera Admin control panel (:3002).
//
// The words themselves live in admin-translations.json next to this file, NOT
// in TypeScript. That split is deliberate (step 500, task 13): translations are
// produced outside the repo by a translation model and dropped in as one file,
// so nobody has to hand-edit a 5000-line source file to add a language.
//
// Everything is STATIC: the JSON is bundled at build time, there is no
// per-request work and no runtime translation call.
//
// 🔒 GRANDE LAW OF STEP 501 — THIS MODULE IS SERVER-ONLY.
// The finished corpus is 82 languages × ~600 keys ≈ 4–6 MB. A single import of
// it from a file carrying "use client" ships EVERY language to the browser and
// cancels the whole point of the language-in-the-URL migration. Server pages
// resolve `getAdminStrings(lang)` and pass the resulting strings to their
// client islands as props. The check is mechanical on every batch: no file with
// "use client" may import this module or the JSON.
//
// Language list mirrors the auth layer's 82 (this overrides rule 4г's "ten
// languages for admin layers").
//
// Never translated: product names (Fractera, OpenAI, PM2, Neon, GitHub), role
// ids, env var names, slugs and enum values.

import translations from "./admin-translations.json";
import { ADMIN_LANGUAGES } from "@/config/translations/admin-languages";
import type { AdminPageSlug, NavGroup } from "@/lib/admin-nav";

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
  // navigation (step 501)
  navGroups: Record<NavGroup, string>;
  // one entry per page of the panel — keys come from lib/admin-nav.ts, so a new
  // page without words does not compile
  pages: Record<AdminPageSlug, { title: string; hint: string }>;
  // shell chrome
  footer: {
    deploy: string;
    pull: string;
    push: string;
    howToBuild: string;
    stateUnknown: string;
  };
  // theme switch in the footer — the icon names the CURRENT mode
  theme: { system: string; light: string; dark: string };
  // Per-page sections. One section per migrated surface, named after its slug.
  // `pages[slug]` keeps the uniform title/hint of EVERY page; anything a single
  // page needs beyond that lives in its own section, so the shape of `pages`
  // never has to bend for one surface (step 501, Ф2).
  howToBuild: { welcomeTitle: string; welcomeBody: string; missing: string };
  users: {
    search: string; searchPlaceholder: string;
    name: string; email: string; role: string; status: string;
    active: string; blocked: string; empty: string;
    total: string; pageOf: string; unavailable: string;
    actions: string; edit: string; block: string; unblock: string; delete: string;
    editTitle: string; nickname: string; roles: string; rolesHint: string;
    cancel: string; save: string;
    blockTitle: string; unblockTitle: string; deleteTitle: string;
    blockBody: string; unblockBody: string; deleteBody: string;
    updated: string; deleted: string; blockedToast: string; unblockedToast: string; failed: string;
    helpLabel: string;
    helpWhatTitle: string; helpWhat: string;
    helpWhyTitle: string; helpWhy: string;
    helpHowTitle: string; helpHow: string;
  };
  // Long-form content read from `_content/` per language (see
  // lib/content/localized-content.ts). Shared by every page that shows a document.
  content: { englishFallback: string };
  // shown on a page whose interface exists but whose logic has not moved yet
  skeletonNotice: string;
  home: { title: string; hint: string };
};

export const DEFAULT_ADMIN_LANG = "en";

// Partial at two levels: the file arrives from an external model and may cover a
// language incompletely, at the top level or inside `pages` / `footer`.
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export const STRINGS = translations as unknown as Record<string, DeepPartial<AdminStrings>>;

const BASE = STRINGS[DEFAULT_ADMIN_LANG] as AdminStrings;

// Two-level merge — a shallow spread would let a partial `pages` object from an
// incomplete language REPLACE the English one wholesale, blanking every title it
// happened to omit. Degrading key by key is the whole promise of this file.
function mergeTwoLevels(base: AdminStrings, entry: DeepPartial<AdminStrings>): AdminStrings {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(entry)) {
    const baseValue = (base as unknown as Record<string, unknown>)[key];
    if (value && typeof value === "object" && !Array.isArray(value) &&
        baseValue && typeof baseValue === "object") {
      const merged: Record<string, unknown> = { ...(baseValue as Record<string, unknown>) };
      for (const [k2, v2] of Object.entries(value as Record<string, unknown>)) {
        const b2 = merged[k2];
        if (v2 && typeof v2 === "object" && b2 && typeof b2 === "object") {
          merged[k2] = { ...(b2 as object), ...(v2 as object) };
        } else if (v2 !== undefined && v2 !== "") {
          merged[k2] = v2;
        }
      }
      out[key] = merged;
    } else if (value !== undefined && value !== "") {
      out[key] = value;
    }
  }
  return out as unknown as AdminStrings;
}

// Resolve a language to its strings, English underneath.
export function getAdminStrings(lang: string): AdminStrings {
  const entry = STRINGS[lang];
  return entry ? mergeTwoLevels(BASE, entry) : BASE;
}

// Языки панели. ЕДИНСТВЕННЫЙ источник — `config/translations/admin-languages.ts`,
// который редактирует владелец. Не ключи корпуса: корпус может уже содержать
// язык, который владелец ещё не включил, и наоборот — включённый язык с неполным
// переводом честно деградирует до английского ключ за ключом.
//
// Целевое состояние продукта — все 82 языка (панель обязана открыться на языке
// покупателя сразу, набор из env здесь невозможен). Список в конфиге — тормоз
// периода разработки, чтобы каждая итерация не собирала 2 132 страницы.
export function adminLanguages(): string[] {
  return [...ADMIN_LANGUAGES];
}

export function isAdminLanguage(lang: string): boolean {
  return ADMIN_LANGUAGES.includes(lang);
}

// Включённый язык без слов — не поломка (английский подставится), но и не
// норма: это видно только в консоли сборки, поэтому там и говорим.
if (process.env.NODE_ENV !== "production") {
  const missing = ADMIN_LANGUAGES.filter((code) => !STRINGS[code]);
  if (missing.length) {
    console.warn(
      `[admin i18n] языки включены в admin-languages.ts, но слов для них в admin-translations.json нет: ${missing.join(", ")} — страницы будут на английском`,
    );
  }
}

// Placeholder substitution: fill("Hello {name}", { name: "Roma" }).
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
}

// Browser-language detector kept for the OLD single-page shell at `/`, which is
// frozen until the cutover. New pages take the language from the URL and must
// NOT call this.
export function detectBrowserLang(): string {
  if (typeof navigator === "undefined") return DEFAULT_ADMIN_LANG;
  const candidates = [navigator.language, ...(navigator.languages ?? [])];
  for (const c of candidates) {
    if (!c) continue;
    const primary = c.toLowerCase().split("-")[0];
    if (isAdminLanguage(primary)) return primary;
  }
  return DEFAULT_ADMIN_LANG;
}
