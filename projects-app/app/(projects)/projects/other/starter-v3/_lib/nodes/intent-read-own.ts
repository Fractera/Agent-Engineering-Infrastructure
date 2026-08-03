// КЛАСС «ЧТЕНИЕ СВОЕГО» (intent, шаг 311). Ответ лежит в СОБСТВЕННЫХ складах автоматизации — вопрос о
// том, что уже сохранено («что я сохранял про X», «когда это было»). Никогда не создаёт запись: вопрос о
// данных — это не данные. В v2 эта граница держалась внутри доменного классификатора и постоянно текла
// («сохранено ✅» в ответ на вопрос); здесь она — отдельный класс.
// Маршрут — в середину. Имя `intentReadOwn` — публичный контракт.
import type { NodeCtx } from "../executor";
import { PASS, claim, claimed, guessClass, matches, requestText } from "./intent-gate";

const FORMS = [
  /\bwhat (did|have) i\b/i,
  /\b(my|our) (notes?|records?|saved|history)\b/i,
  /\b(did|have) i (save|store|record|keep)\b/i,
  /\bwhat do you (have|keep|know) about\b/i,
  /\bwhen (did|was) (i|it|that)\b/i,
];

export async function intentReadOwn(ctx: NodeCtx): Promise<NodeCtx> {
  const text = requestText(ctx);
  if (claimed(ctx) || !text) return PASS;
  const fast = matches(text, FORMS);
  // Быстрый путь — форма на английском; не совпала → судим по ПРОЧТЕНИЮ модели (312.6): класс не может
  // зависеть от языка, на котором человек написал.
  if (!fast && (await guessClass(ctx)) !== "read-own") return PASS;
  return claim("read-own", "intent → middle", { question: text });
}
