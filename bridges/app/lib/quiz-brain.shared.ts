// Разбор круга автоквиза — ЧИСТЫЕ ДАННЫЕ, без единой зависимости.
//
// Файл отделён от `quiz-brain.ts` по механической причине, которая в этом проекте
// уже дважды роняла сборку: сосед читает диск через `fs`, а этот разбор нужен И
// серверу, И островку. Пока они лежали вместе, клиентский бандл тянул серверный
// модуль, и Turbopack честно отвечал `Module not found: Can't resolve 'fs'`.
//
// 🔒 ПРАВИЛО: всё, что нужно И серверу, И островку, живёт в файле без
// зависимостей. Проверять до сборки, а не после.
//
// Формат задаёт промпт автоквиза («Q: … / A: …»), поэтому разбор и промпт обязаны
// меняться вместе — разъедутся они молча, и круг перестанет попадать в ленту.

export type QuizPair = { question: string; answer: string };

/**
 * Разобрать круг автоквиза в пары «вопрос — ответ».
 *
 * Строки вне формата НЕ теряются: они прицепляются к последнему ответу, потому
 * что чаще всего это его продолжение — модель переносит длинную фразу на
 * следующую строку, и терять её половину было бы хуже, чем принять лишнее.
 */
export function parseRound(text: string): QuizPair[] {
  const out: QuizPair[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const q = /^Q\s*[:.]\s*(.+)$/i.exec(line);
    const a = /^A\s*[:.]\s*(.+)$/i.exec(line);
    if (q) { out.push({ question: q[1].trim(), answer: "" }); continue; }
    if (a) { if (out.length) out[out.length - 1].answer = a[1].trim(); continue; }
    if (out.length && out[out.length - 1].answer) out[out.length - 1].answer += " " + line;
  }
  return out.filter((p) => p.question && p.answer);
}

// ── Отказ модели, названный своим именем ─────────────────────────────────────
//
// 🔒 ОДНА ФОРМУЛИРОВКА НА ВСЕ ПОВЕРХНОСТИ (владелец 2026-08-14: «ключ устарел?
// ключа нет? я не понимаю проблему»).
//
// Отказов у модели несколько, и за каждым стоит СВОЁ действие владельца: ключ
// отклонён — заменить; деньги кончились — пополнить; слишком часто — подождать;
// модели нет у ключа — сменить модель. Пока все они показывались одним словом
// «Не удалось», человек шёл проверять то, что работает.
//
// Функция живёт здесь, а не в островке Quiz, потому что тем же отказом отвечает
// правка кейса на доске. Две копии текста разъедутся молча — и разъедутся именно
// в редком отказе, где никто этого не заметит.

export type QuizErrorLabels = {
  failed: string;
  errKeyRejected: string; errQuota: string; errRateLimit: string;
  errModelMissing: string; errUpstream: string;
};

/** Код отказа + подробность от OpenAI → фраза, после которой ясно, что делать. */
export function explainQuizError(code: string, detail: unknown, L: QuizErrorLabels): string {
  const said: Record<string, string> = {
    "key-rejected": L.errKeyRejected,
    quota: L.errQuota,
    "rate-limit": L.errRateLimit,
    "model-missing": L.errModelMissing,
    upstream: L.errUpstream,
  };
  const head = said[code] ?? L.failed;
  // Подробность OpenAI идёт ДОСЛОВНО: в ней и стоит настоящая причина, а пересказ
  // чужой диагностики теряет ровно то, что в ней ценно.
  const tail = typeof detail === "string" && detail.trim() ? ` — ${detail.trim()}` : "";
  return `${head}${tail}`;
}
