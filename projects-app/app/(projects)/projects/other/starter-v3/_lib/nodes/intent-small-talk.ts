// КЛАСС «СОЦИАЛЬНОЕ» (intent, шаг 311). Приветствие, благодарность, вежливость — действий не требует,
// ответа требует. Отдельный класс, потому что в v2 такие сообщения проваливались в содержательную ветку и
// порождали пустые записи («сохранено ✅» в ответ на «спасибо»).
// Маршрут — прямо в выход. Имя `intentSmallTalk` — публичный контракт.
import type { NodeCtx } from "../executor";
import { PASS, claim, claimed, matches, requestText } from "./intent-gate";

const FORMS = [
  /^\s*(hi|hello|hey|good (morning|evening|afternoon))\b/i,
  /^\s*(thanks|thank you|thx|cheers)\b/i,
  /^\s*(bye|goodbye|see you)\b/i,
  /^\s*(ok|okay|got it|great|nice)\s*[.!]?\s*$/i,
];

export async function intentSmallTalk(ctx: NodeCtx): Promise<NodeCtx> {
  const text = requestText(ctx);
  if (claimed(ctx) || !text || !matches(text, FORMS)) return PASS;
  const answer = "Hello. Tell me what to do — record something, look something up outside, or ask what I already keep.";
  return claim("small-talk", "input → intent → output", { reply: answer, text: answer, title: "Small talk" });
}
