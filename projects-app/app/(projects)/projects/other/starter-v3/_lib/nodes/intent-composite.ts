// КЛАСС «СОСТАВНОЙ» (intent, шаг 311). Запрос, который нельзя выполнить одним действием: сначала добыть
// снаружи, потом сверить с сохранённым («когда цена была ниже, чем сейчас»). Его отличительный признак —
// не тема, а ПОРЯДОК: нужен план из шагов, а не один маршрут. Стоит РАНЬШЕ «добычи» и «чтения», иначе
// каждый из них узнал бы в нём свою половину и увёл поток по половине задачи.
// Маршрут — в середину, вместе с планом. Имя `intentComposite` — публичный контракт.
import type { NodeCtx } from "../executor";
import { PASS, claim, claimed, requestText } from "./intent-gate";

// Обе половины в одном обращении: и внешний мир, и собственная запись.
const OUTSIDE = /\b(now|current|currently|today'?s|latest|live)\b/i;
const OWN_PAST = /\b(last time|when was|previously|before|history|ever)\b/i;
const COMPARE = /\b(than|compared to|versus|vs\.?|lower than|higher than|cheaper than)\b/i;

export async function intentComposite(ctx: NodeCtx): Promise<NodeCtx> {
  const text = requestText(ctx);
  if (claimed(ctx) || !text) return PASS;
  const twoSided = OUTSIDE.test(text) && (OWN_PAST.test(text) || COMPARE.test(text));
  if (!twoSided) return PASS;
  return claim("composite", "intent → middle", { plan: ["fetch-outside", "read-own", "compare"], subject: text });
}
