// Возможности приложения — ЧИСТЫЕ ДАННЫЕ, без единой зависимости.
//
// Файл отделён от `platform-features.ts` по механической причине, которая стоила
// упавшей сборки ДВАЖДЫ (партии 18 и 20): островок берёт отсюда порядок и
// список ключей, а сосед читает диск через `fs`. Пока они лежали вместе,
// клиентский бандл тянул серверный модуль, и Turbopack честно отвечал
// `Module not found: Can't resolve 'fs'`.
//
// 🔒 ПРАВИЛО: всё, что нужно И серверу, И островку, живёт в файле без
// зависимостей. Проверять до сборки, а не после.

export type FeatureKey =
  | "auth"
  | "breadcrumbs"
  | "faq"
  | "themeToggle"
  | "widthToggle"
  | "languageSwitcher"
  | "topMenu"
  | "footerPages"
  | "cookieBanner"
  | "contextHandoff";

/**
 * Экспериментальные возможности (владелец 2026-08-10).
 *
 * Отдельная группа на странице, а не строка среди прочих: у неё другая природа
 * обещания. Обычная возможность работает; экспериментальная может измениться или
 * исчезнуть, и включать её — осознанный выбор, а не настройка по умолчанию.
 * Поэтому все они выключены в `FEATURE_DEFAULTS`.
 */
export const EXPERIMENTAL: FeatureKey[] = ["contextHandoff"];

/** Порядок = порядок на странице. Управляющие возможности идут первыми. */
export const FEATURE_ORDER: FeatureKey[] = [
  "topMenu", "footerPages", "cookieBanner",
  "auth", "breadcrumbs", "faq", "themeToggle", "widthToggle", "languageSwitcher",
  "contextHandoff",
];

/** Состояние проекта, который ещё ни разу не настраивали. */
export const FEATURE_DEFAULTS: Record<FeatureKey, boolean> = {
  topMenu: true,
  footerPages: true,
  cookieBanner: false,
  auth: false,
  breadcrumbs: false,
  faq: false,
  themeToggle: true,
  widthToggle: true,
  languageSwitcher: true,
  contextHandoff: false,
};

/**
 * Возможность → раздел панели, который она открывает.
 * Только у трёх есть свой раздел; остальные шесть — просто флаги.
 */
export const FEATURE_SECTION: Partial<Record<FeatureKey, string>> = {
  topMenu: "top-menu",
  footerPages: "footer-pages",
  cookieBanner: "cookie-banner",
  contextHandoff: "doc-context-state",
};

/** Ширину экрана решает раскладка, когда она включена, — переключатель тогда лишний. */
export const OFF_WHEN_PARALLEL: FeatureKey[] = ["widthToggle"];
