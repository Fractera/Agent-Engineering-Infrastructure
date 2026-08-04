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
import { AsyncLocalStorage } from "node:async_hooks";
import { readCore } from "./core-io";
import { providerOf } from "../_components/ai";

// Бережливость токенов (тезис v1): вход и выход ограничены — узлам-навыкам не нужен роман в ответ.
const MAX_INPUT_CHARS = 12_000;
const DEFAULT_MAX_TOKENS = 512;

// 🔒 СЧЁТЧИК МОДЕЛЬНЫХ ВЫЗОВОВ ЗА ПРОГОН (доктрина масштаба, 2026-08-04). Главное утверждение доктрины —
// «цена платится на КАЖДОМ прогоне» — до сих пор нечем было проверить: мы знали число исполненных функций
// узлов, но не число обращений к модели, а платит именно оно. Незамеряемое утверждение недоказуемо, и
// набор проверок (`_checks/`) существует ровно затем, чтобы такие числа были видны и не уползали молча.
//
// Считается ЗДЕСЬ, потому что здесь единственная воронка: два входа (`askModel`, `askModelVision`) и ни
// одного обхода — узлам запрещено звать провайдера мимо этого файла (закон 0). Носитель счёта —
// AsyncLocalStorage, а не модульная переменная: сервер обслуживает прогоны параллельно, и глобальный
// счётчик приписал бы чужие вызовы. Вне прогона (скрипт, тест) хранилища нет — счёт просто не ведётся.
const tally = new AsyncLocalStorage<{ calls: number }>();

/** Выполнить прогон со своим счётом модельных вызовов. Зовёт движок, один раз на прогон. */
export function withModelTally<T>(fn: () => Promise<T>): Promise<T> {
  return tally.run({ calls: 0 }, fn);
}

/** Сколько раз этот прогон обратился к модели. Вне прогона — 0. */
export function modelCalls(): number {
  return tally.getStore()?.calls ?? 0;
}

/** Считаем только СОСТОЯВШИЕСЯ обращения: нет ключа или нечего спросить — денег не потрачено. */
function countCall(): void {
  const store = tally.getStore();
  if (store) store.calls += 1;
}

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
  countCall();
  return provider.key === "anthropic"
    ? askAnthropic(key, model, opts.system, user, maxTokens)
    : askOpenAI(key, model, opts.system, user, maxTokens);
}

export type AskVisionOptions = { system: string; user: string; imageUrl: string; maxTokens?: number };

/**
 * Спросить модель ПО КАРТИНКЕ (шаг 308.3) — то же разрешение провайдера/модели/ключа, что у `askModel`,
 * но пользовательское сообщение мультимодальное: текст + изображение по URL (для Telegram-чека это
 * временный file-URL из `getFile`). Модель паспорта должна быть vision-способной; иначе провайдер вернёт
 * ошибку → бросок (как обычный HTTP-отказ). Нет ключа/сети → `null` (мягкая деградация, как у `askModel`).
 */
export async function askModelVision(opts: AskVisionOptions): Promise<string | null> {
  const url = opts.imageUrl.trim();
  if (!url) return null;

  const core = await readCore();
  const provider = providerOf(core.passport.ai.provider);
  const model = core.passport.ai.model.trim();
  if (!model) return null;
  const key = (process.env[provider.envKey] ?? "").trim();
  if (!key) return null;

  const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
  const user = opts.user.slice(0, MAX_INPUT_CHARS);
  countCall();
  return provider.key === "anthropic"
    ? askAnthropicVision(key, model, opts.system, user, url, maxTokens)
    : askOpenAIVision(key, model, opts.system, user, url, maxTokens);
}

async function askOpenAIVision(key: string, model: string, system: string, user: string, imageUrl: string, maxTokens: number): Promise<string | null> {
  let r: Response;
  try {
    r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: [
            { type: "text", text: user },
            { type: "image_url", image_url: { url: imageUrl } },
          ] },
        ],
        max_completion_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    return null;
  }
  if (!r.ok) throw new Error(`OpenAI vision chat/completions HTTP ${r.status}`);
  const d = (await r.json().catch(() => null)) as { choices?: { message?: { content?: string } }[] } | null;
  const text = d?.choices?.[0]?.message?.content?.trim() ?? "";
  return text || null;
}

async function askAnthropicVision(key: string, model: string, system: string, user: string, imageUrl: string, maxTokens: number): Promise<string | null> {
  let r: Response;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: [
          { type: "text", text: user },
          { type: "image", source: { type: "url", url: imageUrl } },
        ] }],
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    return null;
  }
  if (!r.ok) throw new Error(`Anthropic vision messages HTTP ${r.status}`);
  const d = (await r.json().catch(() => null)) as { content?: { type?: string; text?: string }[] } | null;
  const text = (d?.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
  return text || null;
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
