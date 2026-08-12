import fs from "fs";

// Набор языков гостевого приложения — прямым чтением, для серверных страниц.
//
// ЗАЧЕМ ОТДЕЛЬНО. Раздел настроек приложения узнаёт то же самое по HTTP, обращаясь
// к собственному маршруту `/api/config/languages`. Для страницы, которая и так
// исполняется на сервере, это лишний круг: маршрут читает файл, до которого нам
// два шага. Здесь — тот же файл и те же два ключа, без круга.
//
// 🔒 КЛЮЧИ СВЕРЕНЫ С МАРШРУТОМ, А НЕ УГАДАНЫ. Ошибка в имени ключа не падает —
// она молча отдаёт пустой список, и раздел показывает «языков нет» на
// приложении, где их десять.
//
// 🔒 ЭТО СБОРОЧНЫЕ ПЕРЕМЕННЫЕ. Набор языков меняется пересборкой слота, поэтому
// читать его в рантайме безопасно: между сборками он не меняется.

const APP_ENV = process.env.APP_ENV_PATH ?? "/opt/fractera/app/.env.local";
const SUPPORTED_KEY = "NEXT_PUBLIC_SUPPORTED_LANGUAGES";
const DEFAULT_KEY = "NEXT_PUBLIC_DEFAULT_LOCALE";

function readKey(text: string, key: string): string {
  const m = text.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
}

export type SlotLanguages = { langs: string[]; base: string };

/**
 * Языки слота и язык-основа.
 *
 * Прочитать не удалось — отдаём один английский. Предлагать перевод на языки,
 * которых у приложения может не быть, честнее не делать вовсе: владелец потратит
 * время на текст, который никуда не попадёт.
 */
export function slotLanguages(): SlotLanguages {
  let text = "";
  try {
    text = fs.readFileSync(APP_ENV, "utf-8");
  } catch {
    return { langs: ["en"], base: "en" };
  }

  const langs = readKey(text, SUPPORTED_KEY)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (langs.length === 0) return { langs: ["en"], base: "en" };

  const declared = readKey(text, DEFAULT_KEY);
  return { langs, base: langs.includes(declared) ? declared : langs[0] };
}
