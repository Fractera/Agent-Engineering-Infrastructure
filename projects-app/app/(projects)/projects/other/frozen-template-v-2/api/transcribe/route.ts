import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";

// ДВЕРЬ РАСШИФРОВКИ — своя, внутри автоматизации (перенос v1 `app/api/projects/transcribe`). Голосовой
// примитив папки бьёт СЮДА относительным путём, а не в платформенный роут: папка обязана оставаться
// архивом, который работает там, куда его распаковали (закон 0).
//
// КЛЮЧ — глобальный ключ рабочего пространства (шаг 208): сначала окружение, потом `.env.local` процесса.
// Это единственная внешняя зависимость, и она не код, а среда: своего ключа автоматизация не заводит,
// иначе на каждый архив пришлось бы заводить биллинг. Нет ключа — честный ответ `no-key`, и примитив
// показывает владельцу, где его добавить.
export const runtime = "nodejs";

const OPENAI_URL = "https://api.openai.com/v1/audio/transcriptions";
const MODEL = "gpt-4o-transcribe";
const MAX_BYTES = 25 * 1024 * 1024; // предел самого API — отказываем раньше и понятной строкой

function openAiKey(): string {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    return (raw.match(/^OPENAI_API_KEY=(.+)$/m) ?? [])[1]?.trim() ?? "";
  } catch {
    return "";
  }
}

/** Язык, на котором владелец диктует: язык страницы по умолчанию — модель не гадает. */
const defaultLanguage = () => (process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en").toLowerCase().slice(0, 2);

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const key = openAiKey();
  if (!key) {
    // Клиент показывает СВОЮ 10-языковую строку по этой причине; текст здесь — фолбэк для иного вызывающего.
    return NextResponse.json({ error: "voice input needs the OpenAI key", reason: "no-key" }, { status: 400 });
  }

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "no audio was recorded" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "the recording is too long — record it in shorter pieces" }, { status: 413 });
  }

  const upstream = new FormData();
  upstream.append("file", audio, audio.name || "speech.webm");
  upstream.append("model", MODEL);
  upstream.append("language", defaultLanguage());

  const r = await fetch(OPENAI_URL, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: upstream });
  if (!r.ok) {
    return NextResponse.json({ error: `transcription failed (${r.status})` }, { status: 502 });
  }
  const d = (await r.json()) as { text?: string };
  return NextResponse.json({ ok: true, text: (d.text ?? "").trim() });
}
