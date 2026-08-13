import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/require-auth";

// Отметка «браузер у агента доступен» (владелец 2026-08-13).
//
// 🔒 ПОЧЕМУ ОТМЕТКУ СТАВИТ АГЕНТ, А НЕ ПАНЕЛЬ. Панель работает на сервере, а
// расширение живёт в браузере разработчика — между ними нет канала, по которому
// такой вопрос можно задать. Проверить может только тот, у кого расширение под
// рукой: сам агент, одним вызовом. Поэтому здесь не проверка, а ПРИЁМ факта.
//
// 🔒 ОТМЕТКА ПЕРЕСТАВЛЯЕМАЯ, А НЕ ОДНОРАЗОВАЯ. Разница решает всё. Одноразовая
// говорила бы «когда-то работало» и оставалась зелёной после удаления
// расширения — то есть врала бы ровно тем способом, который этот проект весь
// день выкорчёвывает. Здесь агент присылает своё состояние В КАЖДОЙ сессии:
// нашёл — дата обновляется, не нашёл — строка снимается. Поэтому «зелено»
// означает «работало в последнюю сессию», и это правда.
//
// Ключ живёт в окружении рядом с остальными отметками решений
// (`USER_LANGUAGES_CONFIRMED_AT`, `USER_GITHUB_VERIFIED_AT`) — один дом для
// фактов о том, что владелец и его агент уже сделали.

const APP_ENV = process.env.APP_ENV_PATH ?? "/opt/fractera/app/.env.local";
const MARK = "AGENT_BROWSER_SEEN_AT";

function upsert(content: string, key: string, value: string): string {
  const lines = content.length ? content.split("\n") : [];
  let found = false;
  const next = lines.map((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return line;
    const eq = t.indexOf("=");
    if (eq > 0 && t.slice(0, eq).trim() === key) { found = true; return `${key}=${value}`; }
    return line;
  });
  if (!found) next.push(`${key}=${value}`);
  while (next.length && next[next.length - 1] === "") next.pop();
  return next.join("\n") + "\n";
}

function remove(content: string, key: string): string {
  const next = content.split("\n").filter((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return true;
    const eq = t.indexOf("=");
    return !(eq > 0 && t.slice(0, eq).trim() === key);
  });
  while (next.length && next[next.length - 1] === "") next.pop();
  return next.join("\n") + "\n";
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { connected?: boolean } | null;
  if (typeof body?.connected !== "boolean") {
    return NextResponse.json({ error: "connected_required" }, { status: 400 });
  }

  try {
    const existing = fs.existsSync(APP_ENV) ? fs.readFileSync(APP_ENV, "utf-8") : "";
    const next = body.connected
      ? upsert(existing, MARK, new Date().toISOString())
      : remove(existing, MARK);
    fs.mkdirSync(path.dirname(APP_ENV), { recursive: true });
    fs.writeFileSync(APP_ENV, next, "utf-8");
    return NextResponse.json({ ok: true, connected: body.connected });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
