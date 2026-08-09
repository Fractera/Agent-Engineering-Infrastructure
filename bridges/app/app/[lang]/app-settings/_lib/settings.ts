// Серверное чтение настроек приложения (шаг 501, Ф2, партия 16).
//
// Читаем две вещи разом: сам конфиг приложения и НАБОР ЯЗЫКОВ СЛОТА. Второе нужно
// потому, что языковые поля предлагают перевод ровно на те языки, с которыми
// приложение собирается: предлагать 82 языка приложению на двух — работа без смысла.
//
// Языки слота и языки ПАНЕЛИ — разные множества, и путать их нельзя. Панель живёт
// на своём наборе (config/translations/admin-languages.ts), а здесь речь о языках
// САЙТА владельца, которые он выбрал в разделе языков.

import { headers } from "next/headers";
import type { I18nMap } from "./per-lang";

const ADMIN = process.env.ADMIN_INTERNAL_URL ?? "http://127.0.0.1:3002";

export type AppConfig = Record<string, unknown> & { i18n?: I18nMap };

export type SettingsState = {
  ok: boolean;
  config: AppConfig;
  /** Языки, с которыми собирается приложение владельца. */
  slotLangs: string[];
  /** Язык слота по умолчанию: его значение и есть основное значение поля. */
  slotDefault: string;
  reason?: string;
};

async function ask(path: string): Promise<Record<string, unknown> | null> {
  const cookie = (await headers()).get("cookie") ?? "";
  try {
    const r = await fetch(`${ADMIN}${path}`, {
      headers: { cookie },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    return (await r.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function readSettings(): Promise<SettingsState> {
  const [site, langs] = await Promise.all([
    ask("/api/config/site"),
    ask("/api/config/languages"),
  ]);

  if (!site) {
    return { ok: false, config: {}, slotLangs: [], slotDefault: "en", reason: "config" };
  }

  const config = (site.config ?? {}) as AppConfig;

  // Набор языков слота. Имена полей сверены с маршрутом (`languages` и
  // `defaultLanguage`), а не угаданы: я сначала написал `selected`/`defaultLocale`
  // и был неправ — такая ошибка не падает, она молча даёт пустой список.
  // Если спросить не удалось, показываем один язык по умолчанию: это честнее, чем
  // предлагать перевод на языки, которых у приложения может не быть.
  const selected = Array.isArray(langs?.languages) ? (langs!.languages as string[]) : [];
  const declared = typeof langs?.defaultLanguage === "string" ? (langs!.defaultLanguage as string) : "en";
  const slotDefault = selected.includes(declared) ? declared : (selected[0] ?? "en");

  return {
    ok: true,
    config,
    slotLangs: selected.length ? selected : [slotDefault],
    slotDefault,
  };
}
