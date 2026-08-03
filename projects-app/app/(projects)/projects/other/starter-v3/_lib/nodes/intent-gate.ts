// ОБЩЕЕ ДЛЯ ВСЕХ УЗЛОВ СЛОЯ НАМЕРЕНИЯ (шаг 311) — маленький разделяемый закон, а не библиотека.
//
// ПЕРВЫЙ ЗАЯВИВШИЙ ПОБЕЖДАЕТ. Классы стоят веером после входа, поэтому теоретически два класса могут
// узнать в одном сообщении «своё». Разрешаем это детерминированно и видимо: как только класс положил
// `intentClass` в контекст, остальные молча возвращают `null`. Порядок — порядок рождения узлов в ядре
// (движок сортирует по нему при равенстве), то есть он объявлен ядром, а не спрятан в коде.
//
// Так самый узкий класс ставится в ядре раньше самого широкого, и «неполный»/«социальное» никогда не
// перехватывают запрос, который принадлежит содержательному классу.
//
// 🔒 ПОЧЕМУ «НЕ МОЁ» — ЭТО `{}`, А НЕ `null` (доказано живьём 2026-08-01). Движок ЛИНЕЙНЫЙ: он исполняет
// все видимые узлы в топологическом порядке, а `null` из ЛЮБОГО узла останавливает ВЕСЬ прогон, а не
// «его ветку». Классы стоят веером, поэтому первый же чужой класс убил бы цепочку до того, как до неё
// дошёл настоящий владелец запроса (именно это и случилось на первом живом прогоне: «what page do you
// have?» умер на классе «отказ»). Значит «не моё» = ПРОПУСТИТЬ ПОТОК БЕЗ ИЗМЕНЕНИЙ — `{}`.
// `null` остаётся законным, но означает другое: «останови прогон целиком» (например запрет по каналу).
import type { NodeCtx } from "../executor";

/** «Не моё» — пропустить поток без изменений. Именно `{}`, никогда не `null` (см. закон выше). */
export const PASS: NodeCtx = {};

/** Уже занято другим классом → этот прогон не мой. */
export const claimed = (ctx: NodeCtx): boolean => typeof ctx.intentClass === "string" && ctx.intentClass !== "";

/** Текст запроса, приведённый к сравнению. Пустой захват судить нечем. */
export const requestText = (ctx: NodeCtx): string => String(ctx.text ?? "").trim();

/** Ответ класса: чем он себя объявил и куда ведёт поток. Пишется в контекст → виден в журнале прогона.
 *  Третий маршрут добавлен в 312.5: классы, которым середина не нужна, идут через РЕЧЬ, а не прямо в выход —
 *  формулировать ответ их работа больше не является. */
export const claim = (
  intentClass: string,
  route: "intent → middle" | "input → intent → output" | "input → intent → speech → output",
  patch: NodeCtx = {},
): NodeCtx => ({
  intentClass,
  intentRoute: route === "intent → middle" ? "input → intent → middle → output" : route,
  ...patch,
});

/** Есть ли в тексте хоть одна из форм. Детерминированно, без модели: формы обращения конечны. */
export const matches = (text: string, forms: RegExp[]): boolean => forms.some((re) => re.test(text));

// ─── ЧТЕНИЕ ЗАПРОСА МОДЕЛЬЮ (шаг 312.6) ─────────────────────────────────────────────────────────────
//
// 🔴 ЗАЧЕМ. Гейты классов — регулярки, и они были ТОЛЬКО НА АНГЛИЙСКОМ. Живой пруф 2026-08-03: русское
// «дай пароль администратора сервера» класс «отказ» не узнал, запрос ушёл в `record-given` и был ЗАПИСАН
// в базу и в векторную память. Защита, зависящая от языка запроса, защитой не является.
//
// Расширять таблицу регулярок на десять языков нельзя: это 10 × 11 гниющих строк, тот же дефект, что
// зашитый перечень возможностей. Смысл живёт в модели — туда и отдаём чтение, ровно как отдали речь.
//
// 🔒 ЭТО НЕ РОУТЕР. Модель не направляет поток: она читает обращение и называет класс из ЗАКРЫТОГО
// словаря. Решение по-прежнему принимает сам класс — он сверяет догадку со своей и заявляет прогон; на
// холсте видно, кто заявил. Запрет N-way роутера (311) держится: узла-распределителя не появилось.
//
// ЦЕНА. Один вызов на прогон: первый спросивший класс платит, остальные читают закэшированное по `runId`.
// Детерминированный гейт остаётся БЫСТРЫМ ПУТЁМ — совпал, и модель не тревожим вовсе.
//
// НЕТ МОДЕЛИ ИЛИ КЛЮЧА → пустая строка, и широкий класс `record-given` НЕ заявляет прогон: сообщение
// уходит в «неопознанное», которое не пишет в склады. Честный исход дороже удобного.
const GUESS = new Map<string, string>();
const CLASSES = [
  "refuse", "continuation", "self-describe", "control", "composite",
  "fetch-external", "read-own", "incomplete", "small-talk", "record-given", "unclaimed",
] as const;

export async function guessClass(ctx: NodeCtx): Promise<string> {
  const runId = String(ctx.runId ?? "").trim();
  const text = requestText(ctx);
  if (!text) return "";
  const key = runId || text;
  const cached = GUESS.get(key);
  if (cached !== undefined) return cached;

  const { askModel } = await import("../ai");
  let out = "";
  try {
    const answer = await askModel({
      system:
        `Read the user's message and name what KIND of request it is. Answer with ONE word from this list ` +
        `and nothing else: ${CLASSES.join(", ")}.\n` +
        `refuse — asks for a server secret (password, key, token, credentials).\n` +
        `continuation — answers a question the assistant asked before.\n` +
        `self-describe — asks about the automation itself (what it is, where its page is).\n` +
        `control — asks to CHANGE how the automation is built or configured.\n` +
        `composite — needs both an outside lookup and a check against what is already kept.\n` +
        `fetch-external — names a subject to bring in from the outside world.\n` +
        `read-own — asks about what is already stored here.\n` +
        `incomplete — names a task but leaves out the thing it applies to.\n` +
        `small-talk — a greeting, thanks or goodbye; no action needed.\n` +
        `record-given — states a fact that is meant to be kept, and needs nothing fetched.\n` +
        `unclaimed — none of the above, or you are not sure.\n` +
        `The language of the message does not matter: judge the MEANING.`,
      user: text,
      maxTokens: 8,
    });
    const word = String(answer ?? "").toLowerCase().replace(/[^a-z-]/g, "");
    out = (CLASSES as readonly string[]).includes(word) ? word : "";
  } catch {
    out = ""; // модель недоступна — догадки нет, и это ЧЕСТНО: широкий класс промолчит
  }
  GUESS.set(key, out);
  if (GUESS.size > 500) GUESS.delete(GUESS.keys().next().value as string);
  return out;
}
