import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { requireAuth } from "@/lib/require-auth";
import { transcribeAudio } from "@/_tools/voice-input/server/transcribe";

// Дверь расшифровки речи для панели (шаг 501, 2026-08-09).
//
// ТОНКАЯ ОБЁРТКА над `transcribeAudio` инструмента: проверяет входящего, находит
// ключ и отдаёт результат. Вся работа с OpenAI живёт в инструменте — это его
// серверная половина, и дублировать её в маршруте значило бы завести вторую
// реализацию того же.
//
// КЛЮЧ. Инструмент читает `OPENAI_API_KEY` из окружения процесса, а у панели его
// нет: в этом продукте ключ живёт в окружении службы RAG. Поэтому подставляем его
// В ПАМЯТИ на время вызова — не записывая никуда и не меняя окружение процесса
// навсегда: панель перезапускается редко, и оставленный в ней ключ пережил бы
// его удаление из настроек.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RAG_ENV = process.env.RAG_ENV_PATH ?? "/opt/fractera/services/rag/.env";
const APP_ENV = process.env.APP_ENV_PATH ?? "/opt/fractera/app/.env.local";

function readKeyFrom(file: string, names: string[]): string {
  try {
    const raw = fs.readFileSync(file, "utf-8");
    for (const name of names) {
      const m = raw.match(new RegExp(`^${name}=(.+)$`, "m"));
      if (m && m[1].trim()) return m[1].trim();
    }
  } catch { /* файла нет — идём дальше */ }
  return "";
}

function findKey(): string {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  return (
    readKeyFrom(RAG_ENV, ["OPENAI_API_KEY", "LLM_BINDING_API_KEY", "EMBEDDING_BINDING_API_KEY"]) ||
    readKeyFrom(APP_ENV, ["OPENAI_API_KEY"])
  );
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = findKey();
  if (!key) {
    // Тот же ответ, что даёт сам инструмент: клиент показывает свою подсказку
    // про недостающий ключ, а не общую ошибку.
    return NextResponse.json(
      { ok: false, error: "voice input needs the OpenAI key", reason: "no-key" },
      { status: 400 },
    );
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "form_required" }, { status: 400 });

  const had = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = key;
  try {
    const res = await transcribeAudio(form.get("audio"));
    return NextResponse.json(res, { status: res.ok ? 200 : res.status });
  } finally {
    // Возвращаем окружение как было: ключ живёт в настройках, а не в процессе.
    if (had === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = had;
  }
}
