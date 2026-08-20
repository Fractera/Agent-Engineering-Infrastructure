import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// 🔒 ФЛАГ РЕЖИМА ЧИТАЕТСЯ ИЗ ФАЙЛА, А НЕ ИЗ ПАМЯТИ ПРОЦЕССА (шаг 520, 2026-08-20).
//
// Полный разбор — в близнеце `services/auth/lib/auth-bypass.ts`. Коротко: на живом
// сервере в защищённом режиме `process.env` двух служб нёс устаревшее `true`, и
// весь контур отвечал `demo@local` с ролью архитектора любому в интернете, пока
// все четыре файла окружения на диске честно содержали `false`.
//
// У ПАНЕЛИ ЗДЕСЬ ОСОБАЯ ОТВЕТСТВЕННОСТЬ. Именно её `process.env` разносил заразу:
// `RESTART_AUTH_AND_DATA` (`lib/pm2-restart.ts`) запускается через `spawn`, дочерний
// процесс наследует окружение панели, а `--update-env` записывает унаследованное
// значение в те самые службы, которые перезапуск и должен был вылечить.
//
// 🔗 Близнецы: `services/auth/lib/auth-bypass.ts`, `services/data/auth-bypass.js`,
// `fractera-next-starter/lib/auth/auth-bypass.ts`. Меняешь логику — меняй во всех.

const ENV_FILE = process.env.FRACTERA_ENV_FILE ?? join(process.cwd(), ".env.local");

const TTL_MS = 5_000;
let cachedValue: string | null = null;
let cachedMtime = -1;
let cachedAt = 0;

function flagFromFile({ fresh = false }: { fresh?: boolean } = {}): string | null {
  const now = Date.now();
  if (!fresh && now - cachedAt < TTL_MS) return cachedValue;
  cachedAt = now;
  try {
    const mtime = statSync(ENV_FILE).mtimeMs;
    if (!fresh && mtime === cachedMtime) return cachedValue;
    cachedMtime = mtime;
    const match = readFileSync(ENV_FILE, "utf8").match(/^FRACTERA_IP_NODOMAIN_MODE=(.*)$/m);
    cachedValue = match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
  } catch {
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

/**
 * Значение флага, каким его видит ФАЙЛ — для тех, кому нужно передать режим дальше
 * (перезапуск соседних служб), а не решить вопрос доступа здесь и сейчас.
 *
 * Возвращает строку `"true"`/`"false"`, а не булево: получатель подставляет её в
 * командную строку, и превращать `false` в пустую строку по дороге нельзя.
 *
 * 🔒 ЧИТАЕТ ФАЙЛ ЗАНОВО, МИМО КЭША. Зовут это ровно в момент переключения режима —
 * через доли секунды после того, как файл переписан. Пятисекундный кэш вернул бы
 * здесь ПРЕЖНЕЕ значение и разослал бы его по службам: та самая ошибка, из-за
 * которой всё и случилось, только с новой стороны.
 */
export function modeFlagForChildProcess(): string {
  const fromFile = flagFromFile({ fresh: true });
  if (fromFile !== null) return fromFile === "true" ? "true" : "false";
  return process.env.FRACTERA_IP_NODOMAIN_MODE === "true" ? "true" : "false";
}
