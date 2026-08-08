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
  // width switch in the footer — the label names what the click WILL do
  width: { wide: string; normal: string };
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
  media: {
    uploadVerb: string; image: string; video: string; pdf: string; markdown: string; html: string;
    uploading: string; uploaded: string; failed: string;
    search: string; searchPlaceholder: string; storageNote: string;
    count: string; countFiltered: string; empty: string; noMatch: string; unavailable: string;
    colTitle: string; colName: string; colDescription: string; colUrl: string; colExt: string;
    colType: string; colCrop: string; colSize: string; colDimensions: string; colCreated: string;
    actions: string; preview: string; trim: string; edit: string; copyUrl: string; delete: string;
    copied: string; editTitle: string; titleField: string; descriptionField: string;
    cancel: string; save: string; saved: string;
    deleteTitle: string; deleteBody: string; deleted: string;
    cropper: { title: string; scale: string; cancel: string; apply: string };
    trimmer: {
      title: string; start: string; end: string; keeping: string; lossless: string;
      previewMiddle: string; keepWhole: string; apply: string; reading: string;
      tooShort: string; done: string;
    };
    previewLabels: {
      code: string; preview: string; open: string; close: string;
      reading: string; unreadable: string;
      kindImage: string; kindVideo: string; kindPdf: string; kindMarkdown: string; kindHtml: string; kindFile: string;
    };
    helpLabel: string;
    helpHoldsTitle: string; helpHolds: string;
    helpVsDbTitle: string; helpVsDb: string;
    helpCostTitle: string; helpCost: string;
    helpWeakTitle: string; helpWeak: string;
  };
  vector: {
    unavailable: string; serviceNote: string;
    keyLabel: string; keySet: string; keyNotSet: string;
    modelLabel: string; dimsLabel: string; searchLabel: string; indexed: string; linearScan: string;
    recordsLabel: string; noKey: string;
    searchByMeaning: string; search: string; searchPlaceholder: string; matches: string;
    askSomething: string; nothingFound: string; searchFailed: string;
    colScore: string; colCollection: string; colRow: string; colText: string;
    helpLabel: string;
    helpGetTitle: string; helpGet: string;
    helpWhyTitle: string; helpWhy: string;
    helpWinsTitle: string; helpWins: string;
    helpCostTitle: string; helpCost: string;
    helpWeakTitle: string; helpWeak: string;
    helpSeparateTitle: string; helpSeparate: string;
  };
  rag: {
    serviceLabel: string; running: string; stopped: string; serviceNote: string; serviceOff: string;
    keyLabel: string; keySet: string; keyNotSet: string; noKey: string;
    llmLabel: string; embeddingLabel: string; documentsLabel: string;
    turnOn: string; turnOff: string; ingestText: string; wipe: string;
    ingestTitle: string; ingestHint: string; ingestPlaceholder: string; cancel: string; send: string;
    wipeTitle: string; wipeBody: string; wipeConfirm: string;
    started: string; stoppedToast: string; ingested: string; wiped: string; failed: string;
    askLabel: string; ask: string; askPlaceholder: string; askWarning: string;
    askFailed: string; emptyAnswer: string;
    documentsCount: string; noDocuments: string;
    colStatus: string; colSource: string; colChunks: string; colSummary: string;
    helpLabel: string;
    helpGetTitle: string; helpGet: string;
    helpWhyTitle: string; helpWhy: string;
    helpWinsTitle: string; helpWins: string;
    helpCostTitle: string; helpCost: string;
    helpWeakTitle: string; helpWeak: string;
    helpSeparateTitle: string; helpSeparate: string;
  };
  map: {
    intro: string; serviceNote: string; loadError: string;
    osrm: string; geocoder: string; currentRegion: string; downloading: string;
    noRegion: string; noRegionHint: string;
    assistant: string; quizGreeting: string; askPh: string; thinking: string; noKey: string;
    checkLabel: string; noneFound: string; download: string; provisioningNote: string;
    sizeGb: string; sizeMb: string; hours: string; minutes: string;
    helpLabel: string;
    helpWhatTitle: string; helpWhat: string;
    helpAnswersTitle: string; helpAnswers: string;
    helpWorthTitle: string; helpWorth: string;
    helpWhyOwnTitle: string; helpWhyOwn: string;
    helpCostTitle: string; helpCost: string;
    helpWeakTitle: string; helpWeak: string;
  };
  addTool: {
    body: string;
    exampleImages: string; exampleVideo: string; exampleFlow: string; exampleOther: string;
    how: string; mailSubject: string; note: string;
  };
  backup: {
    empty: string; secretTag: string; secretWarning: string; neverExported: string;
    defaultTotal: string; download: string;
    choose: string; chooseAnother: string; reading: string; nothingYet: string;
    unrecognised: string; createdAt: string; selected: string;
    restore: string; restoring: string; restored: string; nothingNeeded: string; failed: string;
    effects: Record<string, { label: string; effect: string }>;
    helpExportLabel: string;
    helpWhatTitle: string; helpWhat: string;
    helpWhenTitle: string; helpWhen: string;
    helpNotTitle: string; helpNot: string;
    helpImportLabel: string;
    helpAddsTitle: string; helpAdds: string;
    helpReplacesTitle: string; helpReplaces: string;
    helpOrderTitle: string; helpOrder: string;
  };
  domain: {
    unavailable: string; failed: string;
    entryIntro: string; entryLabel: string; entryInvalid: string; cloudflareWarning: string;
    entrySave: string; entrySaving: string; entrySaved: string;
    modeLabel: string; modeSecure: string; modeIp: string; certLabel: string;
    dnsIntro: string; dnsType: string; dnsName: string; dnsValue: string;
    dnsNotes: Record<string, string>;
    step: string; done: string; s1: string; s2: string; s3: string; s4: string; s5: string;
    checkDns: string; recheckDns: string; checkingDns: string;
    dnsAllOk: string; dnsStillMissing: string; dnsNotPropagated: string;
    missingOrWrong: string; changeDomain: string; resetting: string; changeConfirm: string;
    trustQuestion: string; trustBody: string; trustProof: string;
    autoLabel: string; autoHint: string; autoTitle: string; autoNote: string;
    currentCert: string; inCert: string; missingInCert: string;
    issue: string; reissue: string; issuing: string; refreshStatus: string;
    issueStarted: string; issueDone: string; issueFailed: string; issueSlow: string;
    lastFailed: string; lastFailedHint: string;
    uploadTitle: string; uploadHint: string; fullchain: string; privkey: string;
    install: string; installing: string; installStarted: string; bothRequired: string;
    healthIntro: string; runCheck: string; checking: string;
    healthAllOk: string; healthOkOptional: string; healthFailing: string; optional: string;
    activateWarning: string; activateBullets: string[];
    activate: string; activating: string; activateConfirm: string; activateStarted: string;
    liveIntro: string; certAuto: string; certUpload: string; expires: string; renewNote: string;
    openSite: string; reissueSoon: string; comingSoon: string;
    emailIntro: string; emailButton: string; emailSending: string; emailSent: string;
    rollbackIntro: string; rollback: string; rollbackConfirm: string; switchingBack: string;
    footnote: string;
    helpLabel: string;
    helpWhatTitle: string; helpWhat: string;
    helpDnsTitle: string; helpDns: string;
    helpSafetyTitle: string; helpSafety: string;
    helpBackTitle: string; helpBack: string;
  };
  loginMethods: {
    unavailable: string; notSet: string; intro: string; needsSecure: string;
    googleTitle: string; googleHint: string; redirectUriLabel: string;
    uriCopied: string; uriCopyFailed: string;
    googleId: string; googleIdReplace: string; googleSecret: string; googleSecretReplace: string;
    emailTitle: string; emailHint: string;
    resendKey: string; resendKeyReplace: string; resendFrom: string;
    save: string; saving: string; remove: string; removeConfirm: string;
    saved: string; removed: string; failed: string; restartNote: string;
    helpLabel: string;
    helpWhatTitle: string; helpWhat: string;
    helpWhySecureTitle: string; helpWhySecure: string;
    helpEmptyTitle: string; helpEmpty: string;
    helpSecretsTitle: string; helpSecrets: string;
  };
  channels: {
    serviceDown: string; noToken: string; notLinked: string; linkedTo: string;
    tokenRejected: string; currentBot: string;
    tokenLabel: string; tokenPlaceholder: string; tokenReplace: string;
    save: string; saving: string; saved: string; failed: string;
    connect: string; relink: string; waiting: string; openTelegram: string;
    linkedToast: string; linkTimeout: string; linkExpired: string; linkFailed: string;
    channelOn: string; answersFrom: string; neverInvents: string;
    helpLabel: string;
    helpWhatTitle: string; helpWhat: string;
    helpWhyTitle: string; helpWhy: string;
    helpLinkTitle: string; helpLink: string;
    helpOffTitle: string; helpOff: string;
  };
  database: {
    noTables: string; empty: string; unavailable: string; rowsShown: string; noIdColumn: string;
    editTitle: string; valueLabel: string; cancel: string; save: string; delete: string;
    deleteTitle: string; deleteBody: string;
    updated: string; deletedRow: string; failed: string;
    helpLabel: string;
    helpHoldsTitle: string; helpHolds: string;
    helpVsVectorTitle: string; helpVsVector: string;
    helpCostTitle: string; helpCost: string;
    helpWeakTitle: string; helpWeak: string;
    helpTogetherTitle: string; helpTogether: string;
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
//
// 🔴 МАССИВЫ ЗАМЕНЯЮТСЯ ЦЕЛИКОМ, а не сливаются. Это не тонкость, а лечение
// белого экрана (найден владельцем 2026-08-09): вложенный массив
// `domain.activateBullets` попадал во внутреннюю ветку слияния, где
// `{ ...base, ...entry }` превращал `["a","b"]` в `{0:"a",1:"b"}` — объект без
// `.map`, и страница падала с `activateBullets.map is not a function`. Наружная
// ветка от этого защищалась (`!Array.isArray`), внутренняя — нет.
//
// Замена целиком верна и по смыслу: слияние двух списков по индексу смешало бы
// языки в одном перечислении, если в них разное число пунктов. Список — единое
// целое, он либо переведён, либо берётся английским.
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function mergeTwoLevels(base: AdminStrings, entry: DeepPartial<AdminStrings>): AdminStrings {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(entry)) {
    const baseValue = (base as unknown as Record<string, unknown>)[key];
    if (isPlainObject(value) && isPlainObject(baseValue)) {
      const merged: Record<string, unknown> = { ...baseValue };
      for (const [k2, v2] of Object.entries(value)) {
        const b2 = merged[k2];
        if (isPlainObject(v2) && isPlainObject(b2)) {
          merged[k2] = { ...b2, ...v2 };
        } else if (Array.isArray(v2)) {
          // Пустой список — не перевод, а потеря: оставляем английский.
          if (v2.length) merged[k2] = v2;
        } else if (v2 !== undefined && v2 !== "") {
          merged[k2] = v2;
        }
      }
      out[key] = merged;
    } else if (Array.isArray(value)) {
      if (value.length) out[key] = value;
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
