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
//
// 🔒 ЭТОТ ФАЙЛ — ТОЛЬКО СЕРВЕРНЫЙ (здесь `fs`). Всё, что нужно ещё и островку,
// лежит в соседнем `slots.ts` без зависимостей.

import fs from "fs";
import { LIST_ORDER, DEFAULT_SLOTS, type SlotName } from "./slots";

const CONFIG_PATH =
  process.env.PLATFORM_CONFIG_PATH ??
  "/opt/fractera/app/PLATFORM-CONFIG/platform-config.json";

/** Стандарт формата — `ARCHITECTURE-PARALLEL-ROUTING.md` §0.1. Значений ровно два. */
export type RoutingMode = "standard" | "parallel";

export type PlatformState = {
  ok: boolean;
  /** Весь конфиг целиком: сохранение обязано вернуть его с нашими правками, не потеряв чужие ключи. */
  config: Record<string, unknown>;
  mode: RoutingMode;
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

  // Признак режима — `routingMode`. Прежняя форма `parallelRouting: true`
  // читается ради совместимости и при записи исчезает (стандарт, правило 6).
  const mode: RoutingMode =
    config.routingMode === "parallel" || config.parallelRouting === true ? "parallel" : "standard";

  // В стандартном режиме ключа `slots` в файле нет по стандарту, поэтому набор
  // областей показывается умолчанием — ровно то, что получит владелец, включив
  // параллельный режим.
  const slots = (config.slots ?? {}) as Record<string, unknown>;
  const active = LIST_ORDER.filter((s) =>
    typeof slots[s] === "boolean" ? (slots[s] as boolean) : DEFAULT_SLOTS.includes(s),
  );

  return { ok, config, mode, active };
}
