// КЛАСС «ДОБЫЧА СНАРУЖИ» (intent, шаг 311). Данных в сообщении НЕТ — их надо получить из внешнего мира
// («покажи X», «сколько стоит Y сейчас»). Отличается от записи именно этим: запись несёт данные с собой,
// добыча — только имя ПРЕДМЕТА. Класс нейтрален по построению: предмет называет пользователь, и
// автоматизация не знает и не должна знать, что это — башня, кит или двигатель.
// Маршрут — в середину. Имя `intentFetchExternal` — публичный контракт.
import type { NodeCtx } from "../executor";
import { PASS, claim, claimed, guessClass, matches, requestText } from "./intent-gate";

const FORMS = [
  /\b(show|find|look up|search for|get) (me )?(a |an |the )?\S+/i,
  /\bwhat (is|are) (a |an |the )?\S+/i,
  /\bhow much (is|does|do|are)\b/i,
  /\bwho (is|was)\b/i,
];

export async function intentFetchExternal(ctx: NodeCtx): Promise<NodeCtx> {
  const text = requestText(ctx);
  if (claimed(ctx) || !text) return PASS;
  const fast = matches(text, FORMS);
  // Быстрый путь — форма на английском; не совпала → судим по ПРОЧТЕНИЮ модели (312.6): класс не может
  // зависеть от языка, на котором человек написал.
  if (!fast && (await guessClass(ctx)) !== "fetch-external") return PASS;
  return claim("fetch-external", "intent → middle", { subject: text });
}
