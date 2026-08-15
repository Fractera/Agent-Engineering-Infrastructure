import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/require-auth";

// Живое ОФОРМЛЕНИЕ гостевого приложения: цвета, шрифты, шкала текста, формы.
//
// Тот же приём межпроцессной записи, что у настроек приложения и выключателей:
// панель пишет JSON на диск слота, приложение читает его на рендере
// (`config/design-config.ts` → `lib/design-css.ts` → `<style>` в шапке).
// Применяется БЕЗ пересборки — сохранение видно на следующей загрузке страницы.
//
// 🔒 ПУСТОЕ ЗНАЧЕНИЕ ОЗНАЧАЕТ «ТЕМА РЕШАЕТ», А НЕ «ЧЁРНЫЙ ЦВЕТ». Настройка —
// это ПЕРЕКРЫТИЕ темы проекта, поэтому очистка поля обязана удалять ключ, а не
// записывать пустую строку: пустая строка доехала бы до CSS как `--primary: ;`
// и сломала бы правило целиком.
const CONFIG_PATH =
  process.env.DESIGN_CONFIG_PATH ??
  "/opt/fractera/app/DESIGN-CONFIG/design-config.json";

/** Убрать пустые значения и пустые ветки — см. закон выше. */
function prune(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = prune(v);
      const empty =
        cleaned === undefined ||
        cleaned === null ||
        cleaned === "" ||
        (typeof cleaned === "object" && !Array.isArray(cleaned) && Object.keys(cleaned).length === 0);
      if (!empty) out[k] = cleaned;
    }
    return out;
  }
  return typeof value === "string" ? value.trim() : value;
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (!fs.existsSync(CONFIG_PATH)) return NextResponse.json({ config: {} });
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return NextResponse.json({ config: JSON.parse(raw) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as { config?: unknown };
    if (!body.config || typeof body.config !== "object") {
      return NextResponse.json({ error: "config required" }, { status: 400 });
    }

    // Слияние поверх сохранённого — по ВЕТКАМ, а не заменой файла. Страница
    // шрифтов не знает о цветах и не должна их стирать, отправляя свою половину.
    let current: Record<string, unknown> = {};
    if (fs.existsSync(CONFIG_PATH)) {
      try {
        current = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as Record<string, unknown>;
      } catch {
        /* нечитаемый файл заменяем целиком: чинить его вручную владельцу нечем */
      }
    }

    const incoming = prune(body.config) as Record<string, unknown>;
    const next: Record<string, unknown> = { ...current };
    for (const [branch, value] of Object.entries(incoming)) next[branch] = value;
    // Ветка, присланная пустой, означает «здесь ничего не настроено» — убираем.
    for (const branch of Object.keys(body.config as Record<string, unknown>)) {
      if (!(branch in incoming)) delete next[branch];
    }

    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2) + "\n", "utf-8");

    return NextResponse.json({ ok: true, config: next });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
