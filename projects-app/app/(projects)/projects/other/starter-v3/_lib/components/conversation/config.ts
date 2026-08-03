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
  /** 🔒 ЯЗЫК ДЛЯ ЧАТА (шаг 312.7, формулировка владельца) — НЕ «язык по умолчанию».
   *  Задан и непуст → на нём говорим ВСЕГДА. Пуст → язык выбирает сам разговор: что человек написал, а
   *  если он ещё ничего не писал (автоматизация заговорила первой) — язык платформы по умолчанию.
   *  Разница принципиальная: дефолт нужен ровно для первого слова, а не для всей переписки. */
  chatLanguage: string;
  qa: QaPair[];
};

// ИНСТРУКЦИЯ ПОВЕДЕНИЯ по умолчанию — сценарий, по которому МОДЕЛЬ ведёт разговор. Она СОДЕРЖИТ
// идентичность и возможности ассистента: так на любой разговорный вопрос («кто ты», «зачем нужен»,
// приветствие) модель отвечает САМА из этого текста — без перечисления фраз в коде (это была бы функция
// вместо инструкции ИИ). Владелец правит её во вкладке «Ассистент».
// 🔒 НИ ОДНОГО УМЕНИЯ В ЭТОМ ТЕКСТЕ (шаг 312.4). Здесь стоял перечень возможностей — и он гнил по своей
// природе: раскрыли канал, а в перечне его нет; сняли узел, а он остался. Именно так вместе с папкой
// уехала персона telegram-notes v1 и обещала фото чека и карты в сборке «захват → развозка». Теперь
// перечень ВЫВОДИТСЯ из ядра на каждом прогоне (`abilities.ts`) и приезжает модели отдельным блоком
// фактов, который главнее этого текста. Здесь остаётся только ТОН и ГРАНИЦЫ — то, что действительно
// принадлежит поведению. Это дефолт: настоящий сценарий живёт в ядре (вкладка «Ассистент»).
const DEFAULT_INSTRUCTION =
  "You are the conversational assistant of this automation. Speak for it in the first person, warmly and " +
  "briefly — one short message, an emoji where it fits, no preamble, never repeat the question back. " +
  "What this build can do is given to you separately, derived from its core: treat those lines as the only " +
  "truth about abilities. Asked for something outside them, say plainly and kindly that it is not built " +
  "here yet and that the owner adds it in the cockpit. Never invent a result, never promise a feature, " +
  "never claim something was saved unless the run says so.";

export const DEFAULT_ASSISTANT: AssistantConfig = {
  instruction: DEFAULT_INSTRUCTION,
  // СЕССИОННОЕ ОКНО (309, уточнено в 330.1). Сессия = активность в пределах ЧАСА: после часа тишины буфер
  // пуст, и это чистая новая сессия. Прежние 5 минут стирали разговор посреди него — пауза на кофе, и
  // человек объяснял всё заново.
  //
  // 🔒 ЭТО ДЕФОЛТ ДЛЯ ЯДРА БЕЗ ВКЛАДКИ, А НЕ «НАСТОЯЩЕЕ ОКНО». Пока вкладка «Ассистент» есть в ядре,
  // авторитетна ОНА (`memory.lastN` / `memory.ttlMinutes`), и эти числа не применяются вовсе. Раньше здесь
  // стояли 50/60 при 10/5 в ядре, а комментарий описывал поведение, которого не было ни у кого: дефолт был
  // мёртв, ядро тихо побеждало. Значения держим равными ядру, чтобы текст и реальность не расходились.
  //
  // Почему 20, а не 50: токенного бюджета ещё нет (шаг 330.2). Пока ограничитель — счётчик реплик, он
  // обязан быть скромным; с приходом бюджета ограничивать станет он, а не это число.
  lastN: 20,
  ttlMinutes: 60,
  revealCapabilities: true,
  languageMode: "auto",
  fixedLanguage: "",
  chatLanguage: "",
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
    // Совместимость: прежняя пара mode:"fixed" + fixed — это тот же самый смысл, что и новый «язык для
    // чата». Читаем оба, чтобы старая настройка продолжала работать, а новая была понятной владельцу.
    chatLanguage: (typeof lang.chat === "string" && lang.chat.trim())
      ? lang.chat.trim().toLowerCase().slice(0, 5)
      : (lang.mode === "fixed" && typeof lang.fixed === "string" ? lang.fixed.trim().toLowerCase().slice(0, 5) : ""),
    qa: qaRaw
      .map((p) => ({ q: String((p as QaPair)?.q ?? "").trim(), a: String((p as QaPair)?.a ?? "").trim() }))
      .filter((p) => p.q && p.a),
  };
}
