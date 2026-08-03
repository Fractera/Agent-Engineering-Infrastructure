// КЛАСС «НЕДОПУСТИМЫЙ ЗАПРОС» (intent, шаг 311). Есть обращения, на которые ответа быть НЕ ДОЛЖНО:
// секреты сервера, ключи, пароли, строки подключения. Класс стоит в ядре ПЕРВЫМ (первый заявивший
// побеждает), чтобы такой запрос не был перехвачен содержательным классом и не ушёл в середину: отказ
// обязан случиться ДО того, как к делу подключатся склады и инструменты.
// Маршрут — прямо в выход: середине здесь делать нечего. Имя `intentRefuse` — публичный контракт.
import type { NodeCtx } from "../executor";
import { PASS, claim, claimed, guessClass, matches, requestText } from "./intent-gate";

const FORMS = [
  /\b(admin|root|owner|server)?\s*password\b/i,
  /\bapi[- ]?key\b/i,
  /\bsecret\b/i,
  /\baccess token\b/i,
  /\bcredential/i,
  /\bconnection string\b/i,
  /\bdatabase_url\b/i,
  /\.env\b/i,
];

export async function intentRefuse(ctx: NodeCtx): Promise<NodeCtx> {
  const text = requestText(ctx);
  if (claimed(ctx) || !text) return PASS;
  const fast = matches(text, FORMS);
  // Быстрый путь — форма на английском; не совпала → судим по ПРОЧТЕНИЮ модели (312.6): класс не может
  // зависеть от языка, на котором человек написал.
  if (!fast && (await guessClass(ctx)) !== "refuse") return PASS;
  // 🔒 КЛАСС НЕ СОЧИНЯЕТ РЕЧЬ (шаг 312.5). Здесь стояла английская фраза отказа — то есть речь собиралась
  // в слое намерения, мимо узла речи, и приходила на любом языке чата по-английски. Класс объявляет РОД
  // ответа (`speechAct`), а формулирует речь — узел речи, на языке собеседника.
  return claim("refuse", "input → intent → speech → output", { speechAct: "refuse", title: "Refused" });
}
