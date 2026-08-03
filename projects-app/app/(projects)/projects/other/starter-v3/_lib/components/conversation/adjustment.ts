// ЧТО ЧЕЛОВЕК ПОПРОСИЛ ИЗМЕНИТЬ В САМОЙ АВТОМАТИЗАЦИИ (шаг 314, слой эволюции).
//
// 🔴 ЗАЧЕМ ОБЩЕЕ ИЗВЛЕЧЕНИЕ, А НЕ ЧЕТЫРЕ ОТДЕЛЬНЫХ. Областей эволюции четыре, и каждая имеет право писать
// СВОЁ (голос, поведение, примеры, пробел в возможностях) — но ЧИТАЮТ они один и тот же обмен репликами.
// Четыре модельных вызова на прогон ради одного разговора — это вчетверо дороже без единого выигрыша.
// Поэтому чтение общее и кэшируется по `runId`: первый спросивший платит, остальные берут разобранное.
// Тот же приём, что у `guessClass` в слое намерения, и он там уже доказан.
//
// 🔒 РАЗДЕЛЕНИЕ ПРАВ СОХРАНЯЕТСЯ. Общее у областей — ЧТЕНИЕ; ЗАПИСЬ у каждой своя, и именно ею они
// отличаются (§4 ТЗ 314). Один узел, пишущий во всё сразу, был бы отменой этой границы.
//
// 🔒 ЦЕНА РАВНА НУЛЮ НА ОБЫЧНОМ ПРОГОНЕ. Модель зовётся, только когда есть ЧТО извлекать: человек просит
// изменить устройство или манеру (`control`) либо его вообще не поняли (`unclaimed`). Разговор про
// предметы, записи и вопросы к памяти эволюцию не тревожит вовсе — а таких прогонов подавляющее
// большинство. Без этого правила слой удваивал бы стоимость каждого ответа.
import { askModel } from "../../ai";
import type { NodeCtx } from "../../executor";

/** Голос — СТРУКТУРА, а не проза: применяется детерминированно и не может протухнуть незаметно. */
export type VoicePrefs = {
  /** `false` — человек попросил без эмодзи; `true` — попросил их вернуть; `null` — не высказывался. */
  emoji: boolean | null;
  /** Насколько подробно отвечать. `null` — не высказывался. */
  length: "short" | "normal" | "detailed" | null;
  /** Как обращаться («на ты», «по имени») — короткая фраза, не описание характера. */
  address: string;
};

export type Adjustment = {
  /** Просьба о МАНЕРЕ речи. */
  voice: VoicePrefs | null;
  /** Просьба о ПОВЕДЕНИИ (что делать, о чём молчать, чего не предлагать) — одной короткой фразой-правилом. */
  behavior: string | null;
  /** Поправка человека, из которой стоит сделать образец ответа. */
  example: { q: string; a: string } | null;
  /** Просьба о том, чего эта сборка не умеет — фиксируем, ничего не меняя. */
  gap: string | null;
};

const EMPTY: Adjustment = { voice: null, behavior: null, example: null, gap: null };

const CACHE = new Map<string, Adjustment>();

/** Классы, на которых вообще есть смысл спрашивать модель. Остальные прогоны эволюции не касаются. */
const TRIGGERS = new Set(["control", "unclaimed"]);

export async function readAdjustment(ctx: NodeCtx): Promise<Adjustment> {
  const cls = String(ctx.intentClass ?? "").trim();
  if (!TRIGGERS.has(cls)) return EMPTY;

  const text = String(ctx.text ?? "").trim();
  if (!text) return EMPTY;

  const runId = String(ctx.runId ?? "").trim();
  const key = runId || text;
  const cached = CACHE.get(key);
  if (cached) return cached;

  const abilities = String(ctx.abilitiesFacts ?? "").trim();

  let out: Adjustment = EMPTY;
  try {
    const answer = await askModel({
      system:
        `A person is talking to an automation. Read their LAST message and extract, if present, what they ` +
        `want CHANGED about the automation itself. Answer with JSON only, no prose:\n` +
        `{"voice":{"emoji":true|false|null,"length":"short"|"normal"|"detailed"|null,"address":""},` +
        `"behavior":null|"one short standing rule, imperative, about WHAT to do or not do",` +
        `"example":null|{"q":"the question as asked","a":"the answer they wanted"},` +
        `"gap":null|"what they asked for that this build cannot do"}\n\n` +
        `voice — how it should SPEAK (emoji, how detailed, how to address them). Only what they actually said.\n` +
        `behavior — what it should DO or stop doing. NOT about style. NOT a fact to remember.\n` +
        `example — only if they CORRECTED an answer ("no, I meant…"): the exchange worth imitating next time.\n` +
        `gap — only if they asked for a capability that is not in the abilities listed below.\n\n` +
        // 🔒 П4 ТЗ 314 — НИЧЕГО ЛИЧНОГО. Инструкция это системный текст, а не память о человеке: факты
        // живут в складах. Без этого запрета «запиши, что мой адрес такой-то» осело бы в инструкции
        // навсегда и уезжало бы в модель на КАЖДОМ прогоне.
        `NEVER put personal data into any field: no names, addresses, amounts, phone numbers, credentials, ` +
        `dates of someone's life. If the message only states a fact to remember, everything is null.\n` +
        `Nothing asked to change → every field null. Do not invent a request that was not made.` +
        (abilities ? `\n\nWhat this build can do:\n${abilities}` : ""),
      user: text,
      maxTokens: 220,
    });
    const raw = String(answer ?? "").trim();
    const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as Partial<Adjustment>;
    const v = parsed.voice as Partial<VoicePrefs> | null | undefined;
    out = {
      voice:
        v && (typeof v.emoji === "boolean" || v.length || (v.address ?? "").trim())
          ? {
              emoji: typeof v.emoji === "boolean" ? v.emoji : null,
              length: v.length === "short" || v.length === "normal" || v.length === "detailed" ? v.length : null,
              address: String(v.address ?? "").trim().slice(0, 80),
            }
          : null,
      behavior: typeof parsed.behavior === "string" && parsed.behavior.trim() ? parsed.behavior.trim().slice(0, 200) : null,
      example:
        parsed.example && typeof parsed.example === "object" && String(parsed.example.q ?? "").trim() && String(parsed.example.a ?? "").trim()
          ? { q: String(parsed.example.q).trim().slice(0, 200), a: String(parsed.example.a).trim().slice(0, 300) }
          : null,
      gap: typeof parsed.gap === "string" && parsed.gap.trim() ? parsed.gap.trim().slice(0, 200) : null,
    };
  } catch {
    // 🔒 П7 ТЗ 314 — МЯГКАЯ ДЕГРАДАЦИЯ. Нет ключа, модель недоступна, ответ не разобрался → эволюция молча
    // пропускает цикл. Она ВТОРИЧНА по отношению к ответу человеку: ответ уже доставлен, и ронять прогон
    // из-за неудавшегося самоулучшения было бы обменом важного на необязательное.
    out = EMPTY;
  }

  CACHE.set(key, out);
  if (CACHE.size > 300) CACHE.delete(CACHE.keys().next().value as string);
  return out;
}
