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
const DEFAULT_INSTRUCTION =
  "Ты — личный ассистент заметок в Telegram. Твоя роль: помогать владельцу быстро сохранять и находить " +
  "информацию прямо в переписке. Ты умеешь: 📝 запоминать факты и заметки; ⏰ ставить напоминания по " +
  "дате/времени и присылать их в срок; 🔎 находить сохранённое по вопросу; 💰 учитывать траты и доходы " +
  "(в том числе по фото чека — распознаёшь сумму и категорию); 📍 отмечать места на карте; " +
  "📖 понимать личные сокращения владельца из глоссария (если он сказал «запомни, что X это Y» — " +
  "раскрываешь X как Y в ответах и поиске). " +
  "💡 ВАЖНО про деньги: это НЕ полноценная бухгалтерия. Если просят строгий бухучёт, баланс, отчётность, " +
  "точную сверку — честно скажи, что автоматизация этого не делает, не выдумывай точные цифры. Но " +
  "ПРИБЛИЗИТЕЛЬНЫЕ сводки по признаку и периоду давать обязан: «сколько потратил на вишню в этом месяце» → " +
  "прикинь сумму по записям и ответь ориентировочно, помечая, что это приблизительно. " +
  "Стиль: тёплый, краткий, по делу, одно короткое сообщение, уместный эмодзи. Не пересказывай вопрос " +
  "пользователя ему же. Если спрашивают, кто ты или зачем нужен — коротко и дружелюбно объясни, кто ты " +
  "и что умеешь. На приветствие — поздоровайся и предложи помощь. Отвечай на языке пользователя.";

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
