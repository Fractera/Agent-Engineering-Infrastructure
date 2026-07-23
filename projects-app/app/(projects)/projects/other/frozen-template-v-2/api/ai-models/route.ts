import { type NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { readEnvLines } from "@/lib/env-presence";

export const runtime = "nodejs";

// ЖИВЫЕ МОДЕЛИ ПРОВАЙДЕРА (шаг 298, переработано) — список берётся из НАСТОЯЩЕГО API провайдера
// (`/v1/models`), а НЕ из моста кодинг-агента.
//
// ПОЧЕМУ НЕ МОСТ. Сначала я скопировал источник из пульта разработки (мост Codex `get_models`). Но тот
// мост запускает КОДИНГ-АГЕНТА и знает лишь 2–3 модели, которые CLI-подписка даёт для написания кода
// (`~/.codex/models_cache.json`, visibility=list). Автоматизация же думает через API-КЛЮЧ, а у API
// совсем другой, ПОЛНЫЙ каталог (у OpenAI ~110 чат-моделей). Владелец пять раз видел «только две» именно
// из-за неверного источника (2026-07-23). Правильный источник — API самого провайдера.
//
// КЛЮЧ НУЖЕН — И ЭТО ЧЕСТНО. Полный список отдаёт только API, а он требует ключ. Ключ не введён → список
// пуст, форма покажет выбранную модель как есть и подсказку «введите ключ». Значение ключа читается
// сервер-сайд и НАРУЖУ НЕ УХОДИТ (как и во всех дверях этой папки) — уходит только список моделей.
//
// САМОДОСТАТОЧНОСТЬ (закон 0): дверь сама говорит с внешним API провайдера, карту «провайдер → эндпоинт»
// держит у себя; чужих роутов не зовёт.

function keyFromEnv(lines: string[], name: string): string | null {
  for (const line of lines) {
    const m = new RegExp(`^\\s*${name}\\s*=(.*)$`).exec(line);
    if (m) { const v = m[1].trim().replace(/^["']|["']$/g, ""); return v || null; }
  }
  return null;
}

// Порядок для выпадающего списка: базовые имена (gpt-4o, gpt-4.1, o3) ВПЕРЁД, датированные снимки
// (gpt-4o-2024-…) — ниже. Сортируем по [длине id, алфавиту]: короткое = основное.
const byRelevance = (a: { id: string }, b: { id: string }) =>
  a.id.length - b.id.length || a.id.localeCompare(b.id);

async function openaiModels(key: string): Promise<{ id: string; label: string }[]> {
  const r = await fetch("https://api.openai.com/v1/models", { headers: { authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`OpenAI /v1/models HTTP ${r.status}`);
  const d = (await r.json()) as { data?: { id: string }[] };
  // Только текстовые чат-модели: без встраиваний, аудио, изображений, модерации, realtime и completion-only.
  const keep = (id: string) =>
    /^(gpt-|o1|o3|o4|chatgpt)/.test(id) &&
    !/(image|audio|realtime|tts|transcribe|whisper|embedding|moderation|search|instruct|dall)/.test(id);
  return (d.data ?? [])
    .map((m) => m.id)
    .filter(keep)
    .sort()
    .map((id) => ({ id, label: id }))
    .sort(byRelevance);
}

async function anthropicModels(key: string): Promise<{ id: string; label: string }[]> {
  const r = await fetch("https://api.anthropic.com/v1/models?limit=100", {
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
  });
  if (!r.ok) throw new Error(`Anthropic /v1/models HTTP ${r.status}`);
  const d = (await r.json()) as { data?: { id: string; display_name?: string }[] };
  return (d.data ?? [])
    .filter((m) => m.id.startsWith("claude"))
    .map((m) => ({ id: m.id, label: m.display_name ?? m.id }))
    .sort(byRelevance);
}

const PROVIDER_KEY_NAME: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
};

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const provider = (req.nextUrl.searchParams.get("provider") ?? "anthropic").trim();
  const keyName = PROVIDER_KEY_NAME[provider];
  if (!keyName) return NextResponse.json({ error: `unknown provider "${provider}"` }, { status: 400 });

  const key = keyFromEnv(await readEnvLines(), keyName);
  if (!key) {
    // Ключа нет — полный список взять неоткуда. Честно: пусто + причина, форма подскажет ввести ключ.
    return NextResponse.json({ ok: false, provider, models: [], reason: "no_key" });
  }

  try {
    const models = provider === "openai" ? await openaiModels(key) : await anthropicModels(key);
    return NextResponse.json({ ok: true, provider, models });
  } catch (e) {
    return NextResponse.json({ ok: false, provider, models: [], reason: `models unavailable: ${e}` }, { status: 502 });
  }
}
