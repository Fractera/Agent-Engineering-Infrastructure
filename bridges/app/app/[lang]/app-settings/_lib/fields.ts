// Описание полей настроек приложения — КОПИЯ для нового слоя (шаг 501, Ф2, партия 16).
//
// Копия, а не импорт из старой панели: та исчезает на переключении, и страница
// обязана пережить её удаление (правило партии).
//
// ЧТО ИЗМЕНЕНО ПРОТИВ ИСТОЧНИКА — два решения владельца от 2026-08-09:
//
// 1. УБРАНЫ ТРИ МЁРТВЫХ ПОЛЯ: `chatBrand`, `images.chatbot-light`,
//    `images.chatbot-dark`. Проверено грепом по всему госту: потребителей НОЛЬ.
//    Это остатки чата Hermes, снесённого задачей 3 шага 500 — панель просила
//    настроить брендинг чата, которого нет, и загрузить для него две картинки.
//    Остальные 66 полей проверены и живы, поэтому чистка ровно на три поля.
//
// 2. ПОМЕЧЕНЫ ЯЗЫКОВЫЕ ПОЛЯ (`perLang: true`): `name`, `description`,
//    `seo.titleTemplate`, `seo.keywords`, `og.siteName`. Только у них значение
//    зависит от языка; логотип, цвета, координаты, идентификаторы аналитики от
//    языка не зависят вовсе, и заводить им перевод было бы работой без смысла.
//    Дефект, ради которого это сделано: гость отдавал ОДНУ мету на все языки —
//    испанская страница получала английский заголовок и описание.
// Field descriptor for the Site Settings panel (pure data + tiny path helpers).
// One declarative list of sections/fields drives the whole form, so the renderer stays
// small. Paths are dot-notation into the Shell's app-config.json (the Shell deep-merges
// whatever we save over its code defaults, so a partial object is always valid).

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "switch"
  | "select"
  | "image"
  | "icons";

export type Field = {
  /** Значение зависит от языка (шаг 501). Остальные поля — общие для всех языков. */
  perLang?: boolean;
  path: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  // image cropper aspect: square for icons/logos, horizontal (16:9) for OG/illustrations.
  crop?: "square" | "horizontal";
  // Read-only field whose value is DERIVED from the address this server actually answers on
  // (see DOMAIN_DERIVED). Typing an address here was the older behaviour and it is what let
  // the starter's default www.fractera.ai survive on every deployed server: two separate
  // fields carried the same stale address and neither followed the real domain.
  locked?: boolean;
};

export type Section = { title: string; description?: string; fields: Field[] };

const indexing = [
  { value: "allow", label: "Allow (index this site)" },
  { value: "disallow", label: "Disallow (no-index)" },
];
const ogTypes = [
  { value: "website", label: "website" },
  { value: "article", label: "article" },
  { value: "product", label: "product" },
];
const displays = [
  { value: "standalone", label: "standalone" },
  { value: "fullscreen", label: "fullscreen" },
  { value: "minimal-ui", label: "minimal-ui" },
  { value: "browser", label: "browser" },
];
const orientations = [
  { value: "portrait-primary", label: "portrait" },
  { value: "landscape-primary", label: "landscape" },
  { value: "any", label: "any" },
];

export const SECTIONS: Section[] = [
  {
    title: "Brand & identity",
    description: "Core name and description used across titles, OG tags and structured data.",
    fields: [
      { path: "name", label: "App name", type: "text", placeholder: "Fractera" , perLang: true },
      { path: "short_name", label: "Short name", type: "text", placeholder: "Fractera", hint: "Used by the PWA icon label." },
      { path: "description", label: "Description", type: "textarea", placeholder: "What this app is…" , perLang: true },
      { path: "url", label: "Site URL", type: "text", locked: true, hint: "Follows this server's domain. Change it in Settings → Personal Domain." },
      { path: "mailSupport", label: "Support email", type: "text", placeholder: "admin@example.com" },
    ],
  },
  {
    title: "Logo & images",
    description: "Stored in object storage; the app references them by URL. Crop on upload.",
    fields: [
      { path: "logo", label: "Logo", type: "image", crop: "square" },
      { path: "images.ogImage", label: "OG / social image", type: "image", crop: "horizontal" },
      { path: "images.homePage-light", label: "Home illustration (light)", type: "image", crop: "horizontal" },
      { path: "images.homePage-dark", label: "Home illustration (dark)", type: "image", crop: "horizontal" },
      { path: "images.loading-light", label: "Loading (light)", type: "image", crop: "square" },
      { path: "images.loading-dark", label: "Loading (dark)", type: "image", crop: "square" },
      { path: "images.notFound-light", label: "404 (light)", type: "image", crop: "horizontal" },
      { path: "images.notFound-dark", label: "404 (dark)", type: "image", crop: "horizontal" },
      { path: "images.error500-light", label: "500 (light)", type: "image", crop: "horizontal" },
      { path: "images.error500-dark", label: "500 (dark)", type: "image", crop: "horizontal" },
    ],
  },
  {
    title: "App icons & PWA",
    description: "Upload one square logo to generate favicon, apple-touch and PWA icons (192/512/maskable) + manifest.",
    fields: [
      { path: "iconSet", label: "Icon set (square source)", type: "icons" },
      { path: "pwa.themeColor", label: "Theme color", type: "text", placeholder: "#ffffff" },
      { path: "pwa.backgroundColor", label: "Background color", type: "text", placeholder: "#ffffff" },
      { path: "pwa.display", label: "Display", type: "select", options: displays },
      { path: "pwa.orientation", label: "Orientation", type: "select", options: orientations },
      { path: "pwa.startUrl", label: "Start URL", type: "text", placeholder: "/" },
      { path: "pwa.scope", label: "Scope", type: "text", placeholder: "/" },
      { path: "themeColors.light", label: "Browser bar color (light)", type: "text", placeholder: "#ffffff" },
      { path: "themeColors.dark", label: "Browser bar color (dark)", type: "text", placeholder: "#09090b" },
    ],
  },
  {
    title: "Author",
    description: "Default author used in metadata and Person structured data.",
    fields: [
      { path: "author.name", label: "Name", type: "text" },
      { path: "author.email", label: "Email", type: "text" },
      { path: "author.url", label: "URL", type: "text" },
      { path: "author.jobTitle", label: "Job title", type: "text" },
      { path: "author.bio", label: "Bio", type: "textarea" },
      { path: "author.image", label: "Photo", type: "image", crop: "square" },
      { path: "author.twitter", label: "Twitter", type: "text", placeholder: "@handle or URL" },
      { path: "author.linkedin", label: "LinkedIn", type: "text" },
      { path: "author.facebook", label: "Facebook", type: "text" },
    ],
  },
  {
    title: "Social profiles",
    description: "Linked from OG/Twitter cards and Organization sameAs.",
    fields: [
      { path: "seo.social.twitter", label: "Twitter", type: "text", placeholder: "@handle or URL" },
      { path: "seo.social.github", label: "GitHub", type: "text" },
      { path: "seo.social.linkedin", label: "LinkedIn", type: "text" },
      { path: "seo.social.facebook", label: "Facebook", type: "text" },
    ],
  },
  {
    title: "SEO",
    fields: [
      { path: "seo.indexing", label: "Indexing", type: "select", options: indexing },
      { path: "seo.titleTemplate", label: "Title template", type: "text", placeholder: "%s | Brand", hint: "%s is the page title." , perLang: true },
      { path: "seo.robotsIndex", label: "Robots: index", type: "switch" },
      { path: "seo.robotsFollow", label: "Robots: follow", type: "switch" },
      { path: "seo.keywords", label: "Keywords", type: "textarea", placeholder: "comma, separated" , perLang: true },
      { path: "seo.canonicalBase", label: "Canonical base URL", type: "text", locked: true, hint: "Same address as Site URL — search engines use it to name the one true copy of a page." },
      { path: "seo.sitemapUrl", label: "Sitemap URL", type: "text", locked: true, hint: "The site map the app generates at that address." },
      { path: "seo.googleVerification", label: "Google verification", type: "text" },
      { path: "seo.yandexVerification", label: "Yandex verification", type: "text" },
    ],
  },
  {
    title: "OpenGraph",
    fields: [
      { path: "og.type", label: "Type", type: "select", options: ogTypes },
      { path: "og.siteName", label: "Site name", type: "text" , perLang: true },
      { path: "og.locale", label: "Locale", type: "text", placeholder: "en_US" },
      { path: "og.imageWidth", label: "Image width", type: "number", placeholder: "1200" },
      { path: "og.imageHeight", label: "Image height", type: "number", placeholder: "630" },
    ],
  },
  {
    title: "Analytics",
    fields: [
      { path: "analytics.enabled", label: "Enable Google Analytics", type: "switch" },
      { path: "analytics.googleAnalyticsId", label: "Measurement ID", type: "text", placeholder: "G-XXXXXXX" },
    ],
  },
  {
    title: "Structured data (JSON-LD)",
    fields: [
      { path: "jsonLd.website", label: "WebSite schema", type: "switch" },
      { path: "jsonLd.organization", label: "Organization schema", type: "switch" },
      { path: "jsonLd.localBusiness", label: "LocalBusiness schema", type: "switch" },
    ],
  },
  {
    title: "Commerce",
    description:
      "The currency every price on the site is shown and published in. A price without a currency " +
      "means nothing to a visitor, and product markup without it is rejected outright by search " +
      "engines — the price card simply never appears.",
    fields: [
      { path: "commerce.currency", label: "Currency", type: "text", placeholder: "USD · EUR · PLN · RUB" },
    ],
  },
  {
    title: "Local business / address",
    description: "Only used when the LocalBusiness schema above is on.",
    fields: [
      { path: "geo.address", label: "Street address", type: "text" },
      { path: "geo.city", label: "City", type: "text" },
      { path: "geo.country", label: "Country", type: "text" },
      { path: "geo.postalCode", label: "Postal code", type: "text" },
      { path: "geo.phone", label: "Phone", type: "text" },
      { path: "geo.latitude", label: "Latitude", type: "text" },
      { path: "geo.longitude", label: "Longitude", type: "text" },
      { path: "geo.hours", label: "Opening hours", type: "text", placeholder: "Mo-Fr 09:00-18:00" },
    ],
  },
];

// ---- addresses that follow the server, not the typist --------------------------------
//
// `DOMAIN_DERIVED` moved to `lib/public-app-url.ts` and is now APPLIED, which it never was
// while it lived here: this file is route-private, the only importer was the form, and the
// form never called it — so Site URL, Canonical base and Sitemap URL stayed empty on every
// deployment and the app's sitemap came out with zero urls. It is now written server-side in
// `api/config/site`, so every writer of the config gets the same addresses.

// ---- nested get/set on a plain config object (immutable set) -------------------------

export function getAt(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined),
    obj
  );
}

export function setAt<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const root: Record<string, unknown> = { ...obj };
  let cur = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const next = cur[k];
    cur[k] = next && typeof next === "object" && !Array.isArray(next) ? { ...(next as object) } : {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = value;
  return root as T;
}

// Поля, снесённые вместе со своими подсистемами (шаг 501).
//
// Убрать поле из формы — половина работы: в уже сохранённом
// `app-config.json` оно осталось, а редактор отправляет конфиг ЦЕЛИКОМ, поэтому
// при первом же сохранении мёртвое значение уехало бы обратно в файл. Проверено на
// живом сервере: там лежат `chatBrand: "Hermes"` и две картинки чата.
//
// Поэтому список чистится при сохранении. Это не косметика: конфиг читают агенты и
// будущие сессии, и поле с именем работающей подсистемы вводит в заблуждение
// сильнее, чем его отсутствие.
export const REMOVED_FIELDS = ["chatBrand", "images.chatbot-light", "images.chatbot-dark"];

/** Убрать снесённые поля из конфига перед сохранением. */
export function dropRemovedFields<T extends Record<string, unknown>>(config: T): T {
  const out: Record<string, unknown> = { ...config };
  for (const path of REMOVED_FIELDS) {
    const parts = path.split(".");
    if (parts.length === 1) { delete out[parts[0]]; continue; }
    // Вложенный путь: копируем ветку, чтобы не править исходный объект.
    const [head, ...rest] = parts;
    const branch = out[head];
    if (branch && typeof branch === "object" && !Array.isArray(branch)) {
      const copy = { ...(branch as Record<string, unknown>) };
      let cursor = copy;
      for (let i = 0; i < rest.length - 1; i++) {
        const next = cursor[rest[i]];
        if (!next || typeof next !== "object") { cursor = {}; break; }
        cursor[rest[i]] = { ...(next as Record<string, unknown>) };
        cursor = cursor[rest[i]] as Record<string, unknown>;
      }
      delete cursor[rest[rest.length - 1]];
      out[head] = copy;
    }
  }
  return out as T;
}
