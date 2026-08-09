// Возможности приложения (шаг 501, партия 20).
//
// Хранилище — тот же `PLATFORM-CONFIG/platform-config.json`, ветка `features`.
// Применяются БЕЗ пересборки: приложение читает файл в рантайме.
//
// 🔒 ГЛАВНОЕ СВОЙСТВО ЭТОГО РАЗДЕЛА (решение владельца 2026-08-09): три
// возможности — верхнее меню, страницы подвала и cookie — управляют ВИДИМОСТЬЮ
// своих разделов в меню панели. Выключено — раздела ниже нет. Причина простая:
// настраивать баннер, которого в приложении не будет, значит тратить время
// владельца на то, что никогда не покажется.

import fs from "fs";
import type { AdminPageSlug } from "@/lib/admin-nav";

const CONFIG_PATH =
  process.env.PLATFORM_CONFIG_PATH ??
  "/opt/fractera/app/PLATFORM-CONFIG/platform-config.json";

export type FeatureKey =
  | "auth"
  | "breadcrumbs"
  | "faq"
  | "themeToggle"
  | "widthToggle"
  | "languageSwitcher"
  | "topMenu"
  | "footerPages"
  | "cookieBanner";

/** Порядок = порядок на странице. Управляющие возможности идут первыми. */
export const FEATURE_ORDER: FeatureKey[] = [
  "topMenu", "footerPages", "cookieBanner",
  "auth", "breadcrumbs", "faq", "themeToggle", "widthToggle", "languageSwitcher",
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
};

/**
 * Возможность → раздел панели, который она открывает.
 *
 * Только у трёх есть свой раздел; остальные шесть — сами по себе флаги, и
 * настраивать в них нечего.
 */
export const FEATURE_SECTION: Partial<Record<FeatureKey, AdminPageSlug>> = {
  topMenu: "top-menu",
  footerPages: "footer-pages",
  cookieBanner: "cookie-banner",
};

/** Ширину экрана решает раскладка, когда она включена, — переключатель тогда лишний. */
export const OFF_WHEN_PARALLEL: FeatureKey[] = ["widthToggle"];

export type FeaturesState = {
  ok: boolean;
  /** Конфиг целиком: сохранение обязано вернуть его, не потеряв чужие ветки. */
  config: Record<string, unknown>;
  features: Record<FeatureKey, boolean>;
  parallel: boolean;
};

function readConfig(): { ok: boolean; config: Record<string, unknown> } {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return { ok: true, config: {} };
    return { ok: true, config: JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as Record<string, unknown> };
  } catch {
    return { ok: false, config: {} };
  }
}

export function readFeatures(): FeaturesState {
  const { ok, config } = readConfig();
  const saved = (config.features ?? {}) as Record<string, unknown>;

  const features = {} as Record<FeatureKey, boolean>;
  for (const key of FEATURE_ORDER) {
    features[key] = typeof saved[key] === "boolean" ? (saved[key] as boolean) : FEATURE_DEFAULTS[key];
  }

  const parallel = config.routingMode === "parallel" || config.parallelRouting === true;
  return { ok, config, features, parallel };
}

/**
 * Разделы, которых в меню быть не должно: их возможность выключена.
 *
 * Читает шапка на каждой странице. Отказ чтения трактуется как «всё включено» —
 * спрятать раздел из-за сбоя хуже, чем показать лишний: во втором случае человек
 * видит настройку, в первом ищет пропавшую.
 */
export function hiddenSlugs(): Set<AdminPageSlug> {
  const hidden = new Set<AdminPageSlug>();
  try {
    const { features } = readFeatures();
    for (const [key, slug] of Object.entries(FEATURE_SECTION) as [FeatureKey, AdminPageSlug][]) {
      if (!features[key]) hidden.add(slug);
    }
  } catch {
    /* ничего не прячем */
  }
  return hidden;
}
