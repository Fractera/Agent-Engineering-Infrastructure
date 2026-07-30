// ВЫЗОВ МОДЕЛИ — как срединные узлы думают моделью, выбранной в паспорте (`passport.ai`). Папка
// самодостаточна (закон 0): SDK провайдера НЕ импортируется — здесь собственный тонкий нативный fetch к
// тем же двум API, что уже знает дверь `api/ai-models` (OpenAI `/v1/chat/completions`, Anthropic
// `/v1/messages`). Провайдер и модель приходят из ядра; имя ключа провайдера — из каталога `_components/ai.ts`
// (единственный источник, закон 2). Значение ключа живёт только в окружении и наружу не уходит.
//
// ДВЕ РАЗНЫЕ НЕУДАЧИ — ДВА РАЗНЫХ ОТВЕТА (как у памяти):
//   нельзя даже позвать (ключ не введён / сеть недоступна) → `null`: узел мягко деградирует, не падает;
//   провайдер ОТВЕТИЛ ОТКАЗОМ (HTTP-ошибка) → бросок: ключ есть, но запрос отвергнут — молчать нельзя.
// Пустой ответ модели → `null` (нечего вернуть), решает вызывающий узел.
import { readCore } from "./core-io";
import { providerOf } from "../_components/ai";

// Бережливость токенов (тезис v1): вход и выход ограничены — узлам-навыкам не нужен роман в ответ.
const MAX_INPUT_CHARS = 12_000;
const DEFAULT_MAX_TOKENS = 512;

export type AskOptions = { system: string; user: string; maxTokens?: number };

/**
 * Спросить выбранную в паспорте модель. Возвращает текст ответа, `null` при невозможности позвать
 * (нет ключа / сеть), бросает при HTTP-отказе провайдера.
 */
export async function askModel(opts: AskOptions): Promise<string | null> {
  const user = opts.user.slice(0, MAX_INPUT_CHARS).trim();
  if (!user) return null;

  const core = await readCore();
  const provider = providerOf(core.passport.ai.provider);
  const model = core.passport.ai.model.trim();
  if (!model) return null;

  const key = (process.env[provider.envKey] ?? "").trim();
  if (!key) return null; // ключ не введён — узел мягко деградирует, а не падает

  const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
  return provider.key === "anthropic"
    ? askAnthropic(key, model, opts.system, user, maxTokens)
    : askOpenAI(key, model, opts.system, user, maxTokens);
}

async function askOpenAI(key: string, model: string, system: string, user: string, maxTokens: number): Promise<string | null> {
  let r: Response;
  try {
    r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_completion_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    return null; // сеть недоступна — «позвать нельзя», не «отказ»
  }
  if (!r.ok) throw new Error(`OpenAI chat/completions HTTP ${r.status}`);
  const d = (await r.json().catch(() => null)) as { choices?: { message?: { content?: string } }[] } | null;
  const text = d?.choices?.[0]?.message?.content?.trim() ?? "";
  return text || null;
}

async function askAnthropic(key: string, model: string, system: string, user: string, maxTokens: number): Promise<string | null> {
  let r: Response;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    return null;
  }
  if (!r.ok) throw new Error(`Anthropic messages HTTP ${r.status}`);
  const d = (await r.json().catch(() => null)) as { content?: { type?: string; text?: string }[] } | null;
  const text = (d?.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
  return text || null;
}
