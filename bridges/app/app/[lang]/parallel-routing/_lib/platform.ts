// Серверное чтение платформенного конфига (шаг 501, Ф2, партия 18).
//
// Хранилище — `PLATFORM-CONFIG/platform-config.json` в рабочей папке слота. В
// отличие от `APP-CONFIG/app-config.json`, этот файл ОТСЛЕЖИВАЕТСЯ git — два
// соседних файла настроек живут по разным правилам, и это известная
// несогласованность, которую владелец ещё не выбрал как править
// (`ARCHITECTURE.md` §3.5).
//
// Читаем файл напрямую, а не через собственный маршрут `api/config/platform`:
// маршрут делает ровно это же чтение, но требует круга по сети и куки
// авторизации, тогда как страница уже прошла гейт `proxy.ts`.

import fs from "fs";

const CONFIG_PATH =
  process.env.PLATFORM_CONFIG_PATH ??
  "/opt/fractera/app/PLATFORM-CONFIG/platform-config.json";

export type SlotName =
  | "header"
  | "footer"
  | "promoScreen"
  | "left"
  | "right"
  | "centerHeader"
  | "center"
  | "centerFooter";

/** Порядок показа: сверху вниз, как области лежат на экране. */
export const LIST_ORDER: SlotName[] = [
  "header", "promoScreen", "left", "right", "centerHeader", "center", "centerFooter", "footer",
];

/** Шапку и подвал снять нельзя — без них страница не собирается. */
export const LOCKED: SlotName[] = ["header", "footer"];

// Новый проект начинается ОДНОЙ колонкой (решение владельца 2026-08-08). Прежде
// отсутствующий ключ считался включённым, и свежий сервер стартовал со всеми
// восемью областями — самая нагруженная раскладка тому, кто ещё ничего не выбрал.
export const DEFAULT_SLOTS: SlotName[] = ["header", "center", "footer"];

export type PlatformState = {
  ok: boolean;
  /** Весь конфиг целиком: сохранение обязано вернуть его с нашими правками, не потеряв чужие ключи. */
  config: Record<string, unknown>;
  parallelRouting: boolean;
  active: SlotName[];
};

export function readPlatform(): PlatformState {
  let config: Record<string, unknown> = {};
  let ok = false;

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as Record<string, unknown>;
    }
    // Файла может не быть: сервер, где настройки ни разу не сохраняли, живёт на
    // кодовых умолчаниях. Это нормальное состояние, а не ошибка чтения.
    ok = true;
  } catch {
    ok = false;
  }

  const slots = (config.slots ?? {}) as Record<string, unknown>;
  const active = LIST_ORDER.filter((s) =>
    typeof slots[s] === "boolean" ? (slots[s] as boolean) : DEFAULT_SLOTS.includes(s),
  );

  return { ok, config, parallelRouting: config.parallelRouting === true, active };
}
