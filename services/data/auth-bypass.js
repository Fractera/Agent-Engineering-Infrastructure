import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// 🔒 ФЛАГ РЕЖИМА ЧИТАЕТСЯ ИЗ ФАЙЛА, А НЕ ИЗ ПАМЯТИ ПРОЦЕССА (шаг 520, 2026-08-20).
//
// Полный разбор — в близнеце `services/auth/lib/auth-bypass.ts`. Здесь цена ошибки
// была самой высокой: обход в этом файле даёт роль `admin` (см. `requireAuth` в
// `server.js`), поэтому `GET https://data.<домен>/db/tables` отдавал список таблиц
// анонимному запросу из интернета, а запись в базу была открыта тем же путём.
//
// Файл окружения у службы данных называется `.env` и лежит рядом с `server.js`,
// поэтому путь считается от расположения модуля, а не от рабочего каталога.
//
// 🔗 Близнецы: `services/auth/lib/auth-bypass.ts`, `bridges/app/lib/auth-bypass.ts`,
// `fractera-next-starter/lib/auth/auth-bypass.ts`. Меняешь логику — меняй во всех.

const ENV_FILE = process.env.FRACTERA_ENV_FILE ?? fileURLToPath(new URL('.env', import.meta.url))

const TTL_MS = 5_000
let cachedValue = null
let cachedMtime = -1
let cachedAt = 0

function flagFromFile() {
  const now = Date.now()
  if (now - cachedAt < TTL_MS) return cachedValue
  cachedAt = now
  try {
    const mtime = statSync(ENV_FILE).mtimeMs
    if (mtime === cachedMtime) return cachedValue
    cachedMtime = mtime
    const match = readFileSync(ENV_FILE, 'utf8').match(/^FRACTERA_IP_NODOMAIN_MODE=(.*)$/m)
    cachedValue = match ? match[1].trim().replace(/^["']|["']$/g, '') : null
  } catch {
    cachedMtime = -1
    cachedValue = null
  }
  return cachedValue
}

export function shouldBypassAuth() {
  if (process.env.NODE_ENV === 'development') return true
  const fromFile = flagFromFile()
  if (fromFile !== null) return fromFile === 'true'
  return process.env.FRACTERA_IP_NODOMAIN_MODE === 'true'
}
