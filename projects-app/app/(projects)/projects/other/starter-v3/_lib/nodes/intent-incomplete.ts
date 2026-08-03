// КЛАСС «НЕПОЛНЫЙ ЗАПРОС» (intent, шаг 311). Намерение понятно, а данных для него не хватает («запиши
// расход» — какой?). Класс НЕ додумывает недостающее и НЕ роняет прогон: он задаёт уточняющий вопрос и
// оставляет его висеть (`pendingQuestion`), а ответ подберёт класс «продолжение» — один механизм на слое
// вместо копий в каждом узле, как было в v2.
// Маршрут — прямо в выход (вопрос человеку). Имя `intentIncomplete` — публичный контракт.
import type { NodeCtx } from "../executor";
import { PASS, claim, claimed, matches, requestText } from "./intent-gate";

// Глагол-задача без предмета: «record», «save it», «add», «remind».
const BARE_TASK = [/^\s*(record|save|add|store|remind|note|log|keep)\b/i];

export async function intentIncomplete(ctx: NodeCtx): Promise<NodeCtx> {
  const text = requestText(ctx);
  if (claimed(ctx) || !text) return PASS;
  if (!matches(text, BARE_TASK) || text.split(/\s+/).length > 3) return PASS;
  // 🔒 КЛАСС ГОВОРИТ, ЧЕГО НЕ ХВАТАЕТ, А НЕ КАК СПРОСИТЬ (шаг 312.5). Здесь стояла готовая английская
  // фраза вопроса — и узел речи её ЗАТИРАЛ своим ответом, поэтому вопрос до человека не доходил вовсе.
  // Теперь класс объявляет род ответа и предмет нехватки, а формулирует вопрос речь, на языке чата.
  return claim("incomplete", "input → intent → speech → output", {
    speechAct: "ask",
    speechAbout: "what exactly to take down — the request names a task but no subject",
    title: "Clarification",
    pendingQuestion: { about: text, asked: new Date().toISOString() },
  });
}
