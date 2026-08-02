// КЛАСС «УПРАВЛЕНИЕ АВТОМАТИЗАЦИЕЙ» (intent, шаг 311). Владелец меняет не данные, а САМО УСТРОЙСТВО
// автоматизации: что она собирает, о чём спрашивает, когда молчит. В v2 это было замаскировано под
// доменную логику — узлы, менявшие структуру, притворялись узлами предметной области. Управляющий запрос
// отличается от запроса данных и обязан быть отдельным классом.
// Маршрут — в середину: изменение конфигурации выполняет она. Имя `intentControl` — контракт.
import type { NodeCtx } from "../executor";
import { PASS, claim, claimed, matches, requestText } from "./intent-gate";

const FORMS = [
  /\b(start|stop) (collecting|tracking|asking|sending)\b/i,
  /\bfrom now on\b/i,
  /\b(don'?t|do not|never|stop) (write|message|notify|ask|remind) me\b/i,
  /\b(rename|configure|set up|turn (on|off))\b/i,
  /\bremember that\b/i,
];

export async function intentControl(ctx: NodeCtx): Promise<NodeCtx> {
  const text = requestText(ctx);
  if (claimed(ctx) || !text || !matches(text, FORMS)) return PASS;
  return claim("control", "intent → middle", { controlRequest: text });
}
