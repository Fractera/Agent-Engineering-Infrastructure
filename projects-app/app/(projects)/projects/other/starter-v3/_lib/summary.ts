// САММАРИ ЗАПИСИ — короткая форма, которую держат НАШИ склады (шаг 311.9а.4, решение владельца).
//
// РАЗДЕЛЕНИЕ ТРУДА, РАДИ КОТОРОГО ЭТО СДЕЛАНО:
//   ПОИСКОВЫЙ ИНДЕКС (LightRAG) получает ПОЛНЫЙ текст — он ищет по смыслу, ему нужно всё;
//   НАШИ СКЛАДЫ держат САММАРИ и связи — они хранят и связывают, а не ищут словами.
// Полный текст существует в проекте ровно в одном месте: внутри индекса. До этого шага он лежал ТРИЖДЫ —
// в индексе, в строке `vector-memory` (полем `content`) и в записи базы (полем `text`), и из-за этого было
// не видно, зачем в проекте два разных хранилища.
//
// 🔒 ПОЛЕ ЗАПОЛНЕНО ВСЕГДА (решение владельца). Короткий источник не освобождает от саммари — оно просто
// совпадает с ним дословно. Условное поле («саммари, если текст длинный, иначе смотри в текст») заставляет
// ВЕТВИТЬСЯ каждого читателя: интерфейс, агента, соседнюю автоматизацию. Одно поле — один вопрос.
//
// ГРАНИЦА ДЕРЖИТСЯ ЗДЕСЬ, А НЕ В СЕРЕДИНЕ. Сжатие смысла — работа середины (модель); удержание длины —
// работа записи. Поэтому даже когда середина не дала саммари, полный текст в склад не попадёт: он будет
// честно обрезан по границе предложения и помечен.

/** Предел саммари. Владелец: «200–300 знаков»; берём верхнюю границу как жёсткий потолок. */
export const SUMMARY_LIMIT = 300;

/** Откуда взялось саммари — видно человеку и агенту, а не прячется. */
export type SummarySource = "given" | "verbatim" | "truncated";

export type BoundedSummary = { summary: string; summarySource: SummarySource };

/** Обрезка по границе предложения, иначе по границе слова. Добавляет многоточие — обрыв виден. */
function cutAtSentence(text: string, limit: number): string {
  const head = text.slice(0, limit);
  const sentence = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  if (sentence > limit * 0.4) return head.slice(0, sentence + 1);
  const word = head.lastIndexOf(" ");
  return (word > limit * 0.4 ? head.slice(0, word) : head).trimEnd() + "…";
}

/**
 * Саммари для строки склада. Три случая, и ни один не оставляет поле пустым:
 *   `given`     — середина сжала смыслом (`ctx.summary`), уложилась в предел;
 *   `verbatim`  — источник сам короче предела: копия дословно, МОДЕЛЬ НЕ ЗОВЁТСЯ (звать её ради копии —
 *                 трата денег и лишняя точка отказа);
 *   `truncated` — длинный текст без саммари (или саммари длиннее предела): режем сами и помечаем.
 */
export function boundedSummary(given: unknown, fullText: string): BoundedSummary {
  const fromMiddle = String(given ?? "").trim();
  if (fromMiddle) {
    return fromMiddle.length <= SUMMARY_LIMIT
      ? { summary: fromMiddle, summarySource: "given" }
      : { summary: cutAtSentence(fromMiddle, SUMMARY_LIMIT), summarySource: "truncated" };
  }
  const text = String(fullText ?? "").trim();
  if (text.length <= SUMMARY_LIMIT) return { summary: text, summarySource: "verbatim" };
  return { summary: cutAtSentence(text, SUMMARY_LIMIT), summarySource: "truncated" };
}
