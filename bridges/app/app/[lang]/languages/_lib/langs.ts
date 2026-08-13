// Серверное чтение языков приложения (шаг 501, Ф2, партия 17).
//
// Речь о языках САЙТА ВЛАДЕЛЬЦА, а не панели: их два разных набора, и путать нельзя.
// Панель живёт на своём (`config/translations/admin-languages.ts`), здесь —
// `NEXT_PUBLIC_SUPPORTED_LANGUAGES` слота.
//
// Каталог языков читается на сервере и отдаётся уже разобранным: 84 записи с
// флагами, родными названиями и регионами — тащить их в браузер незачем, разметку
// строит сервер.

import { headers } from "next/headers";
import { ALL_LANGUAGE_METADATA, LANGUAGE_REGIONS, type LanguageRegion } from "@/config/translations/language-metadata";

const ADMIN = process.env.ADMIN_INTERNAL_URL ?? "http://127.0.0.1:3002";

export type LangRow = {
  code: string;
  flag: string;
  nativeName: string;
  englishName: string;
  /** Качество машинного перевода: A — высокое, community — данных мало. */
  tier: string;
  selected: boolean;
  isDefault: boolean;
};

export type LangState = {
  ok: boolean;
  byRegion: { region: LanguageRegion; rows: LangRow[] }[];
  selected: string[];
  defaultLanguage: string;
  /** Высказывался ли владелец об этом наборе. Отметку ставит сохранение. */
  confirmed: boolean;
};

export async function readLanguages(): Promise<LangState> {
  const cookie = (await headers()).get("cookie") ?? "";
  let selected: string[] = [];
  let defaultLanguage = "en";
  let ok = false;
  // Пока не доказано обратное, считаем набор НЕподтверждённым: показать лишнюю
  // кнопку безопаснее, чем спрятать единственный способ закрыть требование.
  let confirmed = false;

  try {
    const r = await fetch(`${ADMIN}/api/config/languages`, {
      headers: { cookie },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      const d = await r.json();
      selected = Array.isArray(d.languages) ? (d.languages as string[]) : [];
      defaultLanguage = typeof d.defaultLanguage === "string" ? d.defaultLanguage : (selected[0] ?? "en");
      confirmed = d.confirmed === true;
      ok = true;
    }
  } catch { /* остаётся ok: false — страница скажет об этом */ }

  const chosen = new Set(selected);
  const byRegion = LANGUAGE_REGIONS.map((region) => ({
    region,
    rows: Object.values(ALL_LANGUAGE_METADATA)
      .filter((m) => m.regions.includes(region))
      .map((m) => ({
        code: m.code,
        flag: m.flag,
        nativeName: m.nativeName,
        englishName: m.englishName,
        tier: m.aiTier,
        selected: chosen.has(m.code),
        isDefault: m.code === defaultLanguage,
      }))
      .sort((a, b) => a.nativeName.localeCompare(b.nativeName)),
  })).filter((g) => g.rows.length > 0);

  return { ok, byRegion, selected, defaultLanguage, confirmed };
}
