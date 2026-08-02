// КЛАСС «ПРОДОЛЖЕНИЕ» (intent, шаг 311). Это НЕ новый запрос, а вторая половина прежнего: в диалоге
// висит вопрос автоматизации, и текущее сообщение — ответ на него. В v2 разбор такого ответа был написан
// ДВАЖДЫ внутри доменных узлов, у каждого свой `pending`, — ровно потому, что класса не было в
// архитектуре, и он всплывал копиями там, где понадобился.
// Стоит рано: пока висит вопрос, сообщение принадлежит ему, а не содержательному классу.
// Маршрут — в середину: ответ надо приложить к отложенной работе. Имя `intentContinuation` — контракт.
import type { NodeCtx } from "../executor";
import { PASS, claim, claimed, requestText } from "./intent-gate";

export async function intentContinuation(ctx: NodeCtx): Promise<NodeCtx> {
  const text = requestText(ctx);
  if (claimed(ctx) || !text) return PASS;
  // Висящий вопрос кладёт в контекст тот, кто его задал (класс «неполный» и узлы середины).
  const pending = ctx.pendingQuestion;
  if (!pending || typeof pending !== "object") return PASS;
  return claim("continuation", "intent → middle", { answerTo: pending, answerText: text, pendingQuestion: null });
}
