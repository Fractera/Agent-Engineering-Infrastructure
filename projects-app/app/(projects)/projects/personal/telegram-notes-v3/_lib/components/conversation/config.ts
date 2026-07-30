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

const DEFAULT_INSTRUCTION =
  "Ты — тёплый, краткий ассистент личных заметок в Telegram. Отвечай по делу, дружелюбно, с эмодзи-" +
  "маркером исхода. Не пересказывай вопрос пользователя ему же. Всегда на языке пользователя.";

export const DEFAULT_ASSISTANT: AssistantConfig = {
  instruction: DEFAULT_INSTRUCTION,
  lastN: 10,
  ttlMinutes: 5,
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
