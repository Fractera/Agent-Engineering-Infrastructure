import { type NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { authorize } from "@/lib/nodes";
import { envPath, readEnvLines, presentFromLines } from "@/lib/env-presence";

// ДВЕРЬ КЛЮЧЕЙ — единственное место, где автоматизация узнаёт о своих ключах и записывает их.
//   GET  api/env?keys=A,B      — ПРИСУТСТВИЕ каждого ключа (true/false) и больше ничего
//   POST api/env { key, value, restart? } — записать ОДИН ключ
//
// ГДЕ ЛЕЖАТ ЗНАЧЕНИЯ: в `.env.local` слоя Проекты — один файл на все автоматизации (решение владельца:
// ключи общие на проект). Парсер один на всех — платформенный `lib/env-presence`, чтобы «ключ задан»
// значило одно и то же во всех местах продукта.
//
// 🔒 ЗНАЧЕНИЕ НЕ ОТДАЁТСЯ НАРУЖУ НИКОГДА, даже владельцу и даже своей же странице. Наружу уходит только
// факт «задан / не задан»: форма ключей показывает заполненное поле как заполненное, ей не нужно знать
// сам секрет. Утечка секрета в HTML страницы — это утечка в историю браузера, в кэш и в скриншот.
//
// ЗАПИСЬ — read-modify-write ОДНОЙ строки: остальные строки файла (значения, комментарии, пустые)
// остаются байт в байт. Переписывать файл целиком нельзя — в нём живут ключи всей платформы.
//
// ПЕРЕЗАПУСК ОДИН РАЗ В КОНЦЕ. Значение — рантайм-переменная, поэтому применяется перезапуском процесса,
// а не пересборкой. Но перезапуск в СЕРЕДИНЕ многоключевой формы убил бы запрос на следующий ключ и
// погасил бы страницу владельцу (урок v1, записан в `api/project-config/env`). Поэтому форма шлёт все
// ключи с `restart: false` и только последний с `restart: true`.
export const runtime = "nodejs";

// Ключи, которых эта дверь не касается: публичные build-time переменные (их путь — пересборка, правило
// 143) и платформенные секреты (они принадлежат платформе, а не автоматизации).
const LOCKED_KEYS = new Set(["AUTH_SERVICE_URL", "NEXT_PUBLIC_AUTH_URL", "DEPLOY_SECRET", "DATA_TOKEN", "DATABASE_URL", "APP_ENV_PATH"]);
const KEY_RE = /^[A-Z][A-Z0-9_]*$/;

function keyRejection(key: string): string | null {
  if (!KEY_RE.test(key)) return "key must be UPPER_SNAKE_CASE";
  if (key.startsWith("NEXT_PUBLIC_")) return "public build-time keys need a rebuild, not this door";
  if (LOCKED_KEYS.has(key)) return "key is platform-locked";
  return null;
}

/** Кавычки только там, где без них dotenv разберёт значение неправильно. */
const serialize = (value: string): string => (/[\s#"'\\]/.test(value) ? `"${value.replace(/(["\\])/g, "\\$1")}"` : value);

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const keys = (req.nextUrl.searchParams.get("keys") ?? "").split(",").map((k) => k.trim()).filter(Boolean);
  return NextResponse.json({ present: presentFromLines(await readEnvLines(), keys) });
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { key?: string; value?: string; restart?: boolean };
  const key = (body.key ?? "").trim();
  const value = String(body.value ?? "");
  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });

  const rejection = keyRejection(key);
  if (rejection) return NextResponse.json({ error: rejection }, { status: 422 });

  const lines = await readEnvLines();
  const rendered = `${key}=${serialize(value)}`;
  let replaced = false;
  const next = lines.map((line) => {
    const m = /^\s*([A-Z][A-Z0-9_]*)\s*=/.exec(line);
    if (m && m[1] === key) {
      replaced = true;
      return rendered;
    }
    return line;
  });
  if (!replaced) {
    if (next.length && next[next.length - 1] !== "") next.push("");
    next.splice(next.length - 1, 0, rendered); // перед хвостовой пустой строкой — файл держит один финальный перевод строки
  }
  await writeFile(envPath(), next.join("\n"), "utf8");

  const willRestart = body.restart !== false && process.env.NODE_ENV === "production";
  if (willRestart) {
    try {
      // Отсоединённый перезапуск с паузой: ответ должен успеть уйти до того, как процесс переедет.
      spawn("sh", ["-c", "sleep 1; pm2 restart fractera-projects"], { detached: true, stdio: "ignore" }).unref();
    } catch {
      // значение записано; не поднявшийся перезапуск лечится ручным — терять запись из-за этого нечего
    }
  }

  return NextResponse.json({ ok: true, key, restarting: willRestart });
}
