// КЛАСС «ЗАПИСЬ ДАННОГО» (intent, шаг 311). Данные УЖЕ в сообщении — их надо сохранить, никуда не ходя.
// Самый широкий содержательный класс, поэтому стоит в ядре ПОСЛЕ узких: любое обращение, которое сообщает
// факт и не является вопросом, принадлежит ему. Маршрут — в середину (проверка и нормализация), дальше
// склады. Имя `intentRecordGiven` — публичный контракт.
import type { NodeCtx } from "../executor";
import { PASS, claim, claimed, guessClass, requestText } from "./intent-gate";

const QUESTION = /(\?|^\s*(what|where|when|who|why|how|which|did|do|does|is|are|can|could|show|find|look)\b)/i;

export async function intentRecordGiven(ctx: NodeCtx): Promise<NodeCtx> {
  const text = requestText(ctx);
  if (claimed(ctx) || !text) return PASS;
  if (QUESTION.test(text)) return PASS; // вопрос — не запись
  if (text.split(/\s+/).length < 2) return PASS; // одно слово — скорее социальное или неполное

  // 🔒 САМЫЙ ШИРОКИЙ КЛАСС БОЛЬШЕ НЕ ЯВЛЯЕТСЯ ДЕФОЛТОМ (шаг 312.6). Здесь стояло «всё, что не английский
  // вопрос, — запись»: молчаливый свал, прямо запрещённый законом фронта («неопознанный запрос не
  // сметается в дефолтный класс»). Именно так русский запрос пароля попал в базу и в векторную память.
  //
  // Теперь запись заявляется, только когда запрос ПОЛОЖИТЕЛЬНО прочитан как запись. Модели нет →
  // класс молчит, и прогон достаётся «неопознанному», который в склады не пишет. Потерять запись
  // безопаснее, чем сохранить то, чего человек не просил.
  if ((await guessClass(ctx)) !== "record-given") return PASS;
  return claim("record-given", "intent → middle", { record: text });
}
