// КЛАСС «СОЦИАЛЬНОЕ» (intent, шаг 311). Приветствие, благодарность, вежливость — действий не требует,
// ответа требует. Отдельный класс, потому что в v2 такие сообщения проваливались в содержательную ветку и
// порождали пустые записи («сохранено ✅» в ответ на «спасибо»).
// Маршрут — прямо в выход. Имя `intentSmallTalk` — публичный контракт.
import type { NodeCtx } from "../executor";
import { PASS, claim, claimed, guessClass, matches, requestText } from "./intent-gate";

const FORMS = [
  /^\s*(hi|hello|hey|good (morning|evening|afternoon))\b/i,
  /^\s*(thanks|thank you|thx|cheers)\b/i,
  /^\s*(bye|goodbye|see you)\b/i,
  /^\s*(ok|okay|got it|great|nice)\s*[.!]?\s*$/i,
];

export async function intentSmallTalk(ctx: NodeCtx): Promise<NodeCtx> {
  const text = requestText(ctx);
  if (claimed(ctx) || !text) return PASS;
  const fast = matches(text, FORMS);
  // Быстрый путь — форма на английском; не совпала → судим по ПРОЧТЕНИЮ модели (312.6): класс не может
  // зависеть от языка, на котором человек написал.
  if (!fast && (await guessClass(ctx)) !== "small-talk") return PASS;
  // Класс объявляет род ответа; формулирует речь узел речи на языке чата (шаг 312.5).
  return claim("small-talk", "input → intent → speech → output", { speechAct: "greet", title: "Small talk" });
}
