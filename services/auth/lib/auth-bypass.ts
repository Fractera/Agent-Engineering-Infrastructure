import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// 🔒 ФЛАГ РЕЖИМА ЧИТАЕТСЯ ИЗ ФАЙЛА, А НЕ ИЗ ПАМЯТИ ПРОЦЕССА (шаг 520, 2026-08-20).
//
// ЧТО БЫЛО НЕ ТАК. Правило стояло на `process.env.FRACTERA_IP_NODOMAIN_MODE`, и на
// живом сервере в защищённом режиме оно давало ОБХОД АВТОРИЗАЦИИ для всего интернета:
// `GET https://auth.<домен>/api/session` без единой куки возвращал
// `{"userId":"demo@local","roles":["architect"]}`, а слой данных отдавал таблицы
// анонимному запросу. Все четыре файла окружения на диске при этом честно
// содержали `false`.
//
// Цепочка, из-за которой файл проигрывал памяти:
//   1) панель зовёт `pm2 restart … --update-env` через `spawn`;
//   2) дочерний процесс наследует `process.env` ПАНЕЛИ, где Next при её старте
//      оставил ещё старое `true`;
//   3) `--update-env` дополняет окружение службы этим `true`;
//   4) `dotenv`/Next не переписывают переменную, которая уже есть в `process.env`,
//      поэтому правильное `false` из файла не применялось никогда.
//
// Лечение по существу: правду о режиме знает ФАЙЛ, а не копия в памяти. Устаревшее
// окружение больше ничего не решает — оно осталось лишь запасным путём на случай,
// когда ключа в файле нет вовсе (свежая машина, локальный запуск).
//
// 🔗 ТРИ БЛИЗНЕЦА. Это правило намеренно продублировано в четырёх местах, потому что
// панель, слой данных и гостевой слот — разные репозитории и разные среды выполнения:
//   • `services/data/auth-bypass.js`
//   • `bridges/app/lib/auth-bypass.ts`
//   • `fractera-next-starter/lib/auth/auth-bypass.ts`
// Меняя логику здесь, меняй её во всех четырёх — иначе одна дверь останется открытой.

const ENV_FILE = process.env.FRACTERA_ENV_FILE ?? join(process.cwd(), ".env.local");

// Чтение с диска на каждый запрос было бы расточительно, поэтому значение живёт до
// пяти секунд и обновляется, как только у файла меняется время правки. Пять секунд —
// это задержка, с которой переключение режима вступает в силу; ручной перезапуск
// служб для этого больше не нужен.
const TTL_MS = 5_000;
let cachedValue: string | null = null;
let cachedMtime = -1;
let cachedAt = 0;

function flagFromFile(): string | null {
  const now = Date.now();
  if (now - cachedAt < TTL_MS) return cachedValue;
  cachedAt = now;
  try {
    const mtime = statSync(ENV_FILE).mtimeMs;
    if (mtime === cachedMtime) return cachedValue;
    cachedMtime = mtime;
    const match = readFileSync(ENV_FILE, "utf8").match(/^FRACTERA_IP_NODOMAIN_MODE=(.*)$/m);
    cachedValue = match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
  } catch {
    // Файла нет или он нечитаем — решает окружение, как раньше.
    cachedMtime = -1;
    cachedValue = null;
  }
  return cachedValue;
}

export function shouldBypassAuth(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  const fromFile = flagFromFile();
  if (fromFile !== null) return fromFile === "true";
  return process.env.FRACTERA_IP_NODOMAIN_MODE === "true";
}
