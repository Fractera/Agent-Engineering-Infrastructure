// КЛАСС «УПРАВЛЕНИЕ АВТОМАТИЗАЦИЕЙ» (intent, шаг 311). Владелец меняет не данные, а САМО УСТРОЙСТВО
// автоматизации: что она собирает, о чём спрашивает, когда молчит. В v2 это было замаскировано под
// доменную логику — узлы, менявшие структуру, притворялись узлами предметной области. Управляющий запрос
// отличается от запроса данных и обязан быть отдельным классом.
// Маршрут — в середину: изменение конфигурации выполняет она. Имя `intentControl` — контракт.
import type { NodeCtx } from "../executor";
import { PASS, claim, claimed, guessClass, matches, requestText } from "./intent-gate";

const FORMS = [
  /\b(start|stop) (collecting|tracking|asking|sending)\b/i,
  /\bfrom now on\b/i,
  /\b(don'?t|do not|never|stop) (write|message|notify|ask|remind) me\b/i,
  /\b(rename|configure|set up|turn (on|off))\b/i,
];

export async function intentControl(ctx: NodeCtx): Promise<NodeCtx> {
  const text = requestText(ctx);
  if (claimed(ctx) || !text) return PASS;
  // 🔒 УПРАВЛЯЮЩИЙ ЗАПРОС НЕ ЗАВИСИТ ОТ ЯЗЫКА (314, тот же дефект, что чинили в 312.6 у остальных классов —
  // здесь он оставался). Формы были ТОЛЬКО английские, поэтому «не нужно эмодзи, отвечай подробнее»
  // уходило в «неопознанное», и слой эволюции не получал сигнала вовсе: просьба человека о манере речи
  // физически не могла до него доехать. Быстрый путь остаётся, не совпал — судим прочтением модели.
  //
  // Из форм убран `remember that`: «remember that our standup is at 10am» — это ФАКТ на сохранение
  // (`record-given`), а не изменение устройства. Регулярка перехватывала его и запись не создавалась.
  if (!matches(text, FORMS) && (await guessClass(ctx)) !== "control") return PASS;
  return claim("control", "intent → middle", { controlRequest: text });
}
