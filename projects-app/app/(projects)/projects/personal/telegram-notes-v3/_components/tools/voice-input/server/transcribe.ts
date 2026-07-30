import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { TranscribeResult } from "../types/voice-input";

// СЕРВЕРНАЯ ФУНКЦИЯ микросервиса «голосовой ввод» — расшифровка аудио. Живёт РЯДОМ со своим клиентом
// (микросервис: `client/` + `server/` + `types/` в одной папке), а не разбросана по `api/`. Дверь
// `api/transcribe` — тонкая обёртка: проверяет входящего и зовёт эту функцию.
//
// КЛЮЧ — глобальный ключ рабочего пространства (шаг 208): сначала окружение, потом `.env.local` процесса.
// Единственная внешняя зависимость, и она не код, а среда: своего ключа автоматизация не заводит. Нет
// ключа — честный `no-key`, и клиент показывает владельцу свою 10-языковую подсказку, где его добавить.
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

/** Расшифровать записанное аудио. Возвращает структурный результат; маппинг в HTTP — забота двери. */
export async function transcribeAudio(audio: unknown): Promise<TranscribeResult> {
  const key = openAiKey();
  if (!key) return { ok: false, status: 400, error: "voice input needs the OpenAI key", reason: "no-key" };
  if (!(audio instanceof File) || audio.size === 0) return { ok: false, status: 400, error: "no audio was recorded" };
  if (audio.size > MAX_BYTES) return { ok: false, status: 413, error: "the recording is too long — record it in shorter pieces" };

  const upstream = new FormData();
  upstream.append("file", audio, audio.name || "speech.webm");
  upstream.append("model", MODEL);
  upstream.append("language", defaultLanguage());

  const r = await fetch(OPENAI_URL, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: upstream });
  if (!r.ok) return { ok: false, status: 502, error: `transcription failed (${r.status})` };
  const d = (await r.json()) as { text?: string };
  return { ok: true, text: (d.text ?? "").trim() };
}
