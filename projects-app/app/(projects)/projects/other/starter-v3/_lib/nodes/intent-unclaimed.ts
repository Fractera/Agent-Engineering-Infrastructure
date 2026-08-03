// КЛАСС «НИЧЕЙ ЗАПРОС» (intent, шаг 311) — последний узел слоя и его совесть. Если ни один класс не узнал
// в обращении своё, автоматизация НЕ сваливает его в удобную ветку по умолчанию (именно так в v2
// классификатор при отказе модели молча деградировал в «сохранить»). Она говорит правду: не поняла.
//
// Это не заглушка: класс делает работу, которую фронт обязан делать — закрывает множество исходов, чтобы
// «молча пошло не туда» перестало существовать как поведение.
// Маршрут — прямо в выход. Имя `intentUnclaimed` — публичный контракт.
import type { NodeCtx } from "../executor";
import { PASS, claim, claimed, guessClass, requestText } from "./intent-gate";

export async function intentUnclaimed(ctx: NodeCtx): Promise<NodeCtx> {
  const text = requestText(ctx);
  if (claimed(ctx) || !text) return PASS;
  // Класс объявляет род ответа; формулирует речь узел речи на языке чата (шаг 312.5). Честность исхода от
  // этого не страдает: «не понял» остаётся отдельным классом, а не тихим дефолтом.
  return claim("unclaimed", "input → intent → speech → output", { speechAct: "not-understood", title: "Not recognized" });
}
