// ФУНКЦИЯ УЗЛА «LOGIC» (transform) — РАЗБОР ДАТЫ: достаёт из захваченного текста момент напоминания и
// кладёт его в `ctx.when` (ISO), либо честно помечает `ctx.needsWhen`, если даты нет (шаг 307, узловой
// навык №3 библиотеки середины). Текст сообщения НЕ меняется — это подготовка для выхода «календарь»
// (шаг 307.6 ставит событие на `when`; при `needsWhen` спрашивает пользователя «когда?»).
//
// Разбор идёт моделью (`askModel`), потому что «завтра в 15:00» / «через час» человек пишет как угодно;
// НО ответ модели проверяется ДЕТЕРМИНИРОВАННО: ждём строгий ISO либо слово `none`, любой мусор от модели
// = «даты нет» (`needsWhen`), а не гадаем. Модель недоступна/отвергла → тоже `needsWhen` (безопасная
// деградация: лучше спросить «когда?», чем поставить неверное время). Часовой пояс — СЕРВЕРНЫЙ (модель
// получает серверное «сейчас», её ISO трактуется как локальное время сервера).
// Имя `parseDate` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { askModel } from "../ai";
import { refuse } from "../message";

const noText = {
  en: "No text was captured — there is no date to parse.",
  es: "No se capturó texto: no hay fecha que interpretar.",
  fr: "Aucun texte capturé — il n'y a pas de date à analyser.",
  it: "Nessun testo catturato: non c'è data da interpretare.",
  ru: "Текст не захвачен — нет даты для разбора.",
  de: "Kein Text erfasst — es gibt kein Datum zu ermitteln.",
  pt: "Nenhum texto capturado — não há data para interpretar.",
  pl: "Nie przechwycono tekstu — nie ma daty do odczytania.",
  tr: "Metin yakalanmadı — ayrıştırılacak tarih yok.",
  nl: "Geen tekst vastgelegd — er is geen datum om te lezen.",
};

const ISO_RE = /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?/;

export async function parseDate(ctx: NodeCtx): Promise<NodeCtx> {
  const text = String(ctx.text ?? "").trim();
  if (!text) refuse(noText);

  // ЛОКАЛЬНОЕ «сейчас» сервера (getters отдают время в TZ процесса) — БЕЗ `Z`: суффикс UTC путал модель
  // и ломал арифметику относительных дат. Ответ модели в этом же локальном формате `new Date(iso)`
  // трактует как локальный → `toISOString()` даёт верный UTC.
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const localNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const system =
    `You extract a single reminder date-and-time from the user's message. The current local date-and-time is ` +
    `${localNow}. Resolve any relative expression by ADDING it to that current time — for example, if the ` +
    `current time is 2026-01-01T10:00 and the user says "in 3 hours", the answer is 2026-01-01T13:00. Reply ` +
    `with ONLY an ISO 8601 local datetime in the form YYYY-MM-DDTHH:mm for the moment the user wants to be ` +
    `reminded, or the single word none if the message names no date or time. Output nothing else.`;

  let raw: string | null;
  try {
    raw = await askModel({ system, user: text, maxTokens: 24 });
  } catch (e) {
    return { needsWhen: true, dateError: e instanceof Error ? e.message : String(e) };
  }
  if (raw === null) return { needsWhen: true, dateError: "model unavailable" };

  const answer = raw.trim();
  if (/^none$/i.test(answer)) return { needsWhen: true };

  const m = answer.match(ISO_RE);
  const iso = m ? m[0].replace(" ", "T") : answer;
  const when = new Date(iso);
  if (!Number.isFinite(when.getTime())) return { needsWhen: true, dateError: `unparseable model answer: ${answer}` };

  return { when: when.toISOString(), needsWhen: false };
}
