// КОНФИГ РАЗГОВОРНОГО СЛОЯ (шаг 309) — читает настройки вкладки «Ассистент» из ЯДРА (entity.data), по
// образцу `cronOf` (schedule.ts). Настройки: сценарий поведения (инструкция), окно памяти (N/TTL),
// раскрытие возможностей, язык, Q&A-примеры. Вкладки ещё нет в ядре → возвращаем ДЕФОЛТЫ: так разговорный
// узел работает сразу (закон: узел не падает от отсутствия своей вкладки), а вкладка добавит правку.
import type { Automation } from "../../../_data/automation.schema";

export type QaPair = { q: string; a: string };
export type AssistantConfig = {
  instruction: string;
  lastN: number;
  ttlMinutes: number;
  revealCapabilities: boolean;
  languageMode: "auto" | "fixed";
  fixedLanguage: string;
  qa: QaPair[];
};

// ИНСТРУКЦИЯ ПОВЕДЕНИЯ по умолчанию — сценарий, по которому МОДЕЛЬ ведёт разговор. Она СОДЕРЖИТ
// идентичность и возможности ассистента: так на любой разговорный вопрос («кто ты», «зачем нужен»,
// приветствие) модель отвечает САМА из этого текста — без перечисления фраз в коде (это была бы функция
// вместо инструкции ИИ). Владелец правит её во вкладке «Ассистент».
// 🔒 ЗАТРАВКА, А НЕ ОКОНЧАТЕЛЬНЫЙ ТЕКСТ (2026-08-02). Перечень возможностей здесь ЗАШИТ — и по своей
// природе гниёт: раскрыли канал — он в перечне не появился, сняли узел — не исчез. Именно так в стартер
// вместе с папкой уехала персона telegram-notes v1 и обещала фото чека и карты в сборке `Capture &
// fan-out`. Вывод перечня ИЗ ЯДРА — обязанность слоя `evolution` (шаг 314, §4а): он переписывает этот
// фрагмент на каждой итерации по дверям самоописания. До 314 текст ведётся руками и обязан быть честен
// на момент заморозки. ЗАКОН ТЕКСТА: чего нет в списке — того нет; сочинить возможность нельзя.
const DEFAULT_INSTRUCTION =
  "You are the conversational assistant of this automation. THIS BUILD IS A FROZEN TEST TEMPLATE: it has " +
  "no domain of its own yet — the owner gives it one in the cockpit. Its whole skeleton is capture→fan-out: " +
  "it takes a message from any OPEN input channel (the control panel, an HTTP webhook, a scheduled tick, " +
  "the public page form, its own Telegram bot, the owner's Telegram chat, inbound email) and delivers that " +
  "message, as it is, to every OPEN output channel. It does not interpret the message, does not file it " +
  "anywhere and decides nothing about it. That is the entire list of what this build does. " +
  "If you are asked for anything outside that list — notes, reminders, money or receipts, places on a map, " +
  "search over what was said earlier, reports — say plainly and warmly that this ability is NOT BUILT into " +
  "this template yet and that the owner adds it in the cockpit. Never invent a result, never promise a " +
  "feature, never say that something was \"saved\". " +
  "If asked who you are or what you are for — one short message: a test template waiting for its purpose, " +
  "and what it can do today. " +
  "Style: warm, brief, one short message, an emoji where it fits, no preamble. Do not repeat the user's " +
  "question back at them. Answer in the user's language.";

export const DEFAULT_ASSISTANT: AssistantConfig = {
  instruction: DEFAULT_INSTRUCTION,
  // СЕССИОННОЕ ОКНО (309, требование владельца): в контекст идут ВСЕ сообщения текущей сессии, а сессия =
  // активность в пределах ЧАСА. Малое окно (10 сообщений / 5 мин) делало диалог несвязным. Час TTL +
  // практический потолок 50 сообщений = «вся сессия»; после часа тишины буфер пуст → чистая новая сессия.
  lastN: 50,
  ttlMinutes: 60,
  revealCapabilities: true,
  languageMode: "auto",
  fixedLanguage: "",
  qa: [],
};

const num = (v: unknown, d: number): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : d;
};

/** Настройки вкладки «Ассистент» из ядра; вкладки/entity нет → дефолты (узел работает сразу). */
export function assistantConfigOf(components: Automation["components"]): AssistantConfig {
  const tab = components.tabs.find((t) => t.name === "assistant");
  if (!tab || tab.presence === "absent") return DEFAULT_ASSISTANT;
  const entities = "entities" in tab && Array.isArray(tab.entities) ? tab.entities : "entity" in tab && tab.entity ? [tab.entity] : [];
  const data = (entities[0]?.data ?? {}) as Record<string, unknown>;
  const mem = (data.memory ?? {}) as Record<string, unknown>;
  const lang = (data.language ?? {}) as Record<string, unknown>;
  const qaRaw = Array.isArray(data.qa) ? data.qa : [];
  return {
    instruction: typeof data.instruction === "string" && data.instruction.trim() ? data.instruction : DEFAULT_INSTRUCTION,
    lastN: num(mem.lastN, DEFAULT_ASSISTANT.lastN),
    ttlMinutes: num(mem.ttlMinutes, DEFAULT_ASSISTANT.ttlMinutes),
    revealCapabilities: data.revealCapabilities !== false,
    languageMode: lang.mode === "fixed" ? "fixed" : "auto",
    fixedLanguage: typeof lang.fixed === "string" ? lang.fixed : "",
    qa: qaRaw
      .map((p) => ({ q: String((p as QaPair)?.q ?? "").trim(), a: String((p as QaPair)?.a ?? "").trim() }))
      .filter((p) => p.q && p.a),
  };
}
