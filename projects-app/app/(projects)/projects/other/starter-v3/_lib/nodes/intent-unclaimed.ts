// КЛАСС «НИЧЕЙ ЗАПРОС» (intent, шаг 311) — последний узел слоя и его совесть. Если ни один класс не узнал
// в обращении своё, автоматизация НЕ сваливает его в удобную ветку по умолчанию (именно так в v2
// классификатор при отказе модели молча деградировал в «сохранить»). Она говорит правду: не поняла.
//
// Это не заглушка: класс делает работу, которую фронт обязан делать — закрывает множество исходов, чтобы
// «молча пошло не туда» перестало существовать как поведение.
// Маршрут — прямо в выход. Имя `intentUnclaimed` — публичный контракт.
import type { NodeCtx } from "../executor";
import { PASS, claim, claimed, requestText } from "./intent-gate";

export async function intentUnclaimed(ctx: NodeCtx): Promise<NodeCtx> {
  const text = requestText(ctx);
  if (claimed(ctx) || !text) return PASS;
  const answer =
    "I did not recognize what kind of request this is, so I am not guessing. Tell me whether to record it, look it up outside, or search what I already keep.";
  return claim("unclaimed", "input → intent → output", { reply: answer, text: answer, title: "Not recognized" });
}
