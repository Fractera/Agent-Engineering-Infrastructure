// КЛАСС «ЗАПИСЬ ДАННОГО» (intent, шаг 311). Данные УЖЕ в сообщении — их надо сохранить, никуда не ходя.
// Самый широкий содержательный класс, поэтому стоит в ядре ПОСЛЕ узких: любое обращение, которое сообщает
// факт и не является вопросом, принадлежит ему. Маршрут — в середину (проверка и нормализация), дальше
// склады. Имя `intentRecordGiven` — публичный контракт.
import type { NodeCtx } from "../executor";
import { PASS, claim, claimed, requestText } from "./intent-gate";

const QUESTION = /(\?|^\s*(what|where|when|who|why|how|which|did|do|does|is|are|can|could|show|find|look)\b)/i;

export async function intentRecordGiven(ctx: NodeCtx): Promise<NodeCtx> {
  const text = requestText(ctx);
  if (claimed(ctx) || !text) return PASS;
  if (QUESTION.test(text)) return PASS; // вопрос — не запись
  if (text.split(/\s+/).length < 2) return PASS; // одно слово — скорее социальное или неполное
  return claim("record-given", "intent → middle", { record: text });
}
