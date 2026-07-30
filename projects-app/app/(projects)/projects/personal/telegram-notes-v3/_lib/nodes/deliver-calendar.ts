// ФУНКЦИЯ УЗЛА «OUTPUT» (канал calendar) — ставит захваченное сообщение событием в календарь
// автоматизации: строка таблицы `calendar` в форме, которую читает вкладка (поля v1 дословно —
// `_lib/components/calendar/index.ts`): date "YYYY-MM-DD", time "HH:MM", title, type, notifyBefore,
// integrations.
//
// ВРЕМЯ СОБЫТИЯ (шаг 307.6): разобранная серединой дата `ctx.when` (её кладёт узел `parseDate`) важнее
// момента захвата — так «напомни завтра в 15:00» встаёт на завтра, а не на сейчас. Нет `when` → момент
// захвата (`at`), как прежде. `ctx.needsWhen` (parseDate не нашёл даты) → честный отказ «когда?» на
// десяти языках: записи без времени не создаём.
//
// ОТВЕТ НАСТУПЛЕНИЕМ В КАНАЛ-ИСТОЧНИК (шаг 307.6): чтобы напоминание реально дошло, у записи должна быть
// АКТИВНАЯ интеграция — иначе `api/calendar-tick` рассылать нечего. Ставим её на тот telegram-канал,
// ОТКУДА пришёл запрос (личный чат → личный чат): спросил напоминание в телеграме — там же его и получил.
// Развозку самой записи по наступлению делает `deliverDue` (`_lib/components/calendar/deliver.ts`).
// Имя `deliverCalendar` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { messageOf, servesIntent } from "../message";
import { addRow } from "../rows";

// Telegram-каналы, в которые развозка по наступлению умеет ответить текстом (адрес — из окружения, не из
// строки): личный чат и рабочий чат бота. Пришёл запрос одним из них → напоминание уходит назад туда же.
const REPLY_CHANNELS = new Set(["user-telegram-chat", "telegram-bot"]);

const needWhen = {
  en: "When should I remind you? Reply with a date or a time.",
  es: "¿Cuándo debo recordártelo? Responde con una fecha o una hora.",
  fr: "Quand dois-je te le rappeler ? Réponds avec une date ou une heure.",
  it: "Quando devo ricordartelo? Rispondi con una data o un'ora.",
  ru: "Когда напомнить? Ответь датой или временем.",
  de: "Wann soll ich dich erinnern? Antworte mit einem Datum oder einer Uhrzeit.",
  pt: "Quando devo lembrar-te? Responde com uma data ou uma hora.",
  pl: "Kiedy mam przypomnieć? Odpowiedz datą lub godziną.",
  tr: "Ne zaman hatırlatayım? Bir tarih veya saat ile yanıtla.",
  nl: "Wanneer moet ik je herinneren? Antwoord met een datum of tijd.",
};

export async function deliverCalendar(ctx: NodeCtx): Promise<NodeCtx> {
  // Ветка НАПОМИНАНИЯ (308.8): событие ставим только для намерения `remind`; иначе молчим. Backward-compat.
  if (!servesIntent(ctx, "remind")) return { calendarDelivery: "skipped: not a remind intent" };
  // parseDate не нашёл даты — записи не создаём (её время неизвестно), а вопрос «когда?» кладём В
  // ПОЛЕЗНУЮ НАГРУЗКУ, чтобы следующий выходной узел ДОСТАВИЛ его человеку в канал-источник. Прежний
  // бросок (307.6) честен только у пульта: HTTP-ответ двери видит вызывающий, а человек в реальном
  // чате не видит ничего — вопрос обязан ехать тем же каналом, что и запрос (изменение 307.14R,
  // объявлено владельцу). Прогон при этом НЕ провальный: «спросить дату» — штатный исход.
  if (ctx.needsWhen === true) {
    return { calendarRowId: "", calendarWhen: "", title: "Reminder", text: `${needWhen.ru}\n\n${needWhen.en}`, remindQuestion: true };
  }

  const m = messageOf(ctx);
  // Время события: разобранное `when` важнее момента захвата. Компоненты берутся ЛОКАЛЬНЫМИ getter'ами —
  // так же их читает `dueAtMs` (строка без зоны = местное время), поэтому round-trip совпадает.
  const whenStr = typeof ctx.when === "string" ? ctx.when.trim() : "";
  const parsed = whenStr ? new Date(whenStr) : new Date(m.at);
  const when = Number.isFinite(parsed.getTime()) ? parsed : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");

  // ЧАТ ДЛЯ ОТЛОЖЕННОЙ РАЗВОЗКИ ЕДЕТ С ЗАПИСЬЮ (308, авто-захват): id личного чата берём из самого
  // прогона (`telegramChatId`, его принёс входной узел из сообщения владельца) и кладём в запись. Так
  // напоминание в срок доходит БЕЗ ручного ввода `TELEGRAM_USER_CHAT_ID` — владельцу достаточно ввести
  // токен и написать боту. Пусто (запуск не из чата) → развозка честно падёт на env-фолбэк.
  const chatId = String((ctx as Record<string, unknown>).telegramChatId ?? "").trim();
  const integrations = REPLY_CHANNELS.has(m.source)
    ? { [m.source]: { active: true, text: m.text, ...(chatId ? { chatId } : {}) } }
    : {};

  // Язык чата в запись (309): отложенная развозка (`deliverDue`) возьмёт его для локализованной шапки
  // напоминания — иначе бралась бы платформенная дефолт-локаль (жалоба владельца: intro на английском).
  // Приоритет: явный `ctx.lang` → зафиксированный язык чата в состоянии не читаем здесь (закон 0 узла) →
  // детект по тексту сообщения (кириллица → ru). Простой сигнал, покрывает главный кейс.
  const explicit = String((ctx as Record<string, unknown>).lang ?? "").toLowerCase().slice(0, 2);
  const lang = explicit || (/[Ѐ-ӿ]/.test(m.text) ? "ru" : "");
  const row = await addRow("calendar", {
    date: `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`,
    time: `${pad(when.getHours())}:${pad(when.getMinutes())}`,
    title: m.title,
    type: "event",
    notifyBefore: 0,
    integrations,
    source: m.source,
    ...(lang ? { lang } : {}),
  });
  return { calendarRowId: row.id, calendarWhen: when.toISOString() };
}
