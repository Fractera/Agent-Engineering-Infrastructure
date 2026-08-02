// КОНТРАКТ ДАННЫХ АВТОМАТИЗАЦИИ — ОДНА форма сообщения, которую говорят ВСЕ каналы (шаг 300).
//
// Автоматизация — «захват → развозка»: каждый ВХОДНОЙ узел нормализует сырой конверт своего канала в
// это сообщение, середина проверяет и дополняет его, каждый ВЫХОДНОЙ узел доставляет его по назначению.
// Именно общий контракт делает канал СМЕННЫМ: середине всё равно, пришёл текст письмом, вебхуком или из
// формы пульта — она видит одинаковые поля.
//
//   text   — захваченное содержимое (обязательное, непустое; пустой вход честно бросает у двери)
//   source — входной канал, откуда сообщение пришло ("control-panel", "webhook", "email", …)
//   at     — момент захвата, ISO-строка
//   title  — короткий заголовок, выведенный из текста (первая строка, ≤80 знаков) — его ставит середина
//   lat/lng — необязательные координаты: их несут не все каналы; их использует выход «карта»
export type Message = {
  text: string;
  source: string;
  at: string;
  title?: string;
  lat?: number;
  lng?: number;
  // ИДЕНТИФИКАТОР КАНАЛА-БОТА — публичный ID Telegram-бота (числовой префикс токена). Один проект может
  // иметь НЕСКОЛЬКО ботов (у каждого пользователя свой), поэтому без него векторная память не различит, от
  // кого пришёл факт. Толкает ЛИСТЕНЕР бота в payload запуска (`ctx.botId`) — узел ключей не читает (закон 3).
  botId?: string;
  // ВЛОЖЕНИЯ (шаг 308.2) — не-текстовый вход. `photoFileId` — id самого большого PhotoSize (изображение;
  // скачивается через Telegram getFile). `placeTitle` — имя места из шаринга локации (venue). Координаты
  // живут в `lat`/`lng` выше. Их проносит ВХОДНОЙ узел канала; фронт и середина читают их из контекста —
  // не из ключей (закон 3).
  photoFileId?: string;
  placeTitle?: string;
};

// КАКОЙ КАНАЛ ЗАПУСТИЛ ЭТОТ ПРОГОН. Дверь запуска кладёт в input поле `source`; движок исполняет ВСЕ
// видимые узлы, поэтому каждый приёмник сперва спрашивает «мой ли это прогон» и, если канал чужой,
// честно возвращает {} — не участвует. Отсутствующий `source` означает пульт: это дверь по умолчанию,
// которая существует всегда (закон `passport.md` §6.1).
export const channelOf = (ctx: Record<string, unknown>): string =>
  String(ctx.source ?? "control-panel").trim() || "control-panel";

/** Число из контекста, если оно там есть и конечно — для необязательных координат. */
export const numberField = (v: unknown): number | undefined => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
};

/**
 * Общая сборка сообщения приёмником: текст + канал + момент, плюс координаты, если канал их принёс.
 * Пустой текст здесь НЕ проверяется — это забота вызывающего приёмника: у каждого канала свой честный
 * текст отказа (на десяти языках), и он должен бросить ДО сборки.
 */
export function captured(ctx: Record<string, unknown>, source: string, text: string): Message {
  const lat = numberField(ctx.lat);
  const lng = numberField(ctx.lng ?? ctx.lon);
  return {
    text: text.trim(),
    source,
    at: new Date().toISOString(),
    ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
  };
}

/** Заголовок из текста: первая непустая строка, обрезанная до 80 знаков. Детерминированно. */
export function deriveTitle(text: string): string {
  const line = text.split("\n").map((s) => s.trim()).find(Boolean) ?? "";
  return line.length <= 80 ? line : `${line.slice(0, 79)}…`;
}

/** Сообщение, каким его видит ВЫХОДНОЙ узел: середина уже проверила текст и вывела заголовок. */
export function messageOf(ctx: Record<string, unknown>): Required<Pick<Message, "text" | "source" | "at" | "title">> & Pick<Message, "lat" | "lng" | "botId" | "photoFileId" | "placeTitle"> {
  return {
    text: String(ctx.text ?? ""),
    source: String(ctx.source ?? "unknown"),
    at: String(ctx.at ?? new Date().toISOString()),
    title: String(ctx.title ?? deriveTitle(String(ctx.text ?? ""))),
    lat: numberField(ctx.lat),
    lng: numberField(ctx.lng),
    // Идентификатор бота, если приёмник его пронёс (см. Message.botId) — выход-память впишет его в провенанс.
    botId: ctx.botId ? String(ctx.botId).trim() || undefined : undefined,
    // Вложения (308.2): выход-хранилище/карта читают их отсюда.
    photoFileId: ctx.photoFileId ? String(ctx.photoFileId).trim() || undefined : undefined,
    placeTitle: ctx.placeTitle ? String(ctx.placeTitle).trim() || undefined : undefined,
  };
}

/**
 * Честный отказ пользователю: бросок с картой на десяти языках (правило 4г). RunReport/тост пульта
 * разворачивают JSON и показывают язык страницы — образец задан ещё биржевым receive-request.
 */
export function refuse(messages: Record<string, string>): never {
  throw new Error(JSON.stringify(messages));
}

/** Десятиязычный отказ «канал не принёс текста» — общий для приёмников, имя канала подставляется. */
export const emptyInput = (channel: string): Record<string, string> => ({
  en: `The ${channel} channel delivered no text — an empty message starts nothing.`,
  es: `El canal ${channel} no entregó texto: un mensaje vacío no inicia nada.`,
  fr: `Le canal ${channel} n'a transmis aucun texte — un message vide ne démarre rien.`,
  it: `Il canale ${channel} non ha consegnato testo: un messaggio vuoto non avvia nulla.`,
  ru: `Канал ${channel} не принёс текста — пустое сообщение ничего не запускает.`,
  de: `Der Kanal ${channel} lieferte keinen Text — eine leere Nachricht startet nichts.`,
  pt: `O canal ${channel} não entregou texto — uma mensagem vazia não inicia nada.`,
  pl: `Kanał ${channel} nie dostarczył tekstu — pusta wiadomość niczego nie uruchamia.`,
  tr: `${channel} kanalı metin iletmedi — boş bir mesaj hiçbir şey başlatmaz.`,
  nl: `Het kanaal ${channel} leverde geen tekst — een leeg bericht start niets.`,
});

/**
 * СОВПАДЕНИЕ HOOK-ФРАЗЫ (шаг 307.7) — начинается ли текст одной из фраз-триггеров. Так группа
 * автоматизаций делит один канал: каждая сама-гейтит СВОЮ фразу, чужая → не её прогон. Нормализация —
 * регистр, `ё→е`, схлопнутые пробелы (голос и клавиатура пишут по-разному). Детерминированно, БЕЗ AI.
 * Возвращает `payload` (хвост ПОСЛЕ фразы) и саму `phrase`, либо `null`, если ни одна не подошла.
 */
const foldHook = (s: string): string => s.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();

/**
 * САМО-ГЕЙТ ПО КЛАССУ ЗАПРОСА (шаг 311) — «мой ли это прогон?».
 *
 * 🔒 ОДНА СИСТЕМА КЛАССИФИКАЦИИ, А НЕ ДВЕ. До слоя намерения в папке жил `ctx.intent` — мульти-флаг
 * словаря ОДНОЙ предметной области, который ставил срединный узел-классификатор. Он удалён вместе с
 * остальным доменом v2, а фронт ставит `ctx.intentClass` — ОДНО значение из
 * словаря `IntentClassSchema`. Две системы с почти одинаковыми именами в одной папке — гарантированная
 * путаница для модели, поэтому старая удалена целиком, а не оставлена «на совместимость».
 *
 * Класс СТАВИТ ТОЛЬКО ФРОНТ; выходной узел его лишь читает. Нет класса (прогон без фронта — например
 * прямой вызов двери) → возвращаем `true`: узел работает безусловно, как и до появления слоя.
 */
export function servesClass(ctx: Record<string, unknown>, mine: string): boolean {
  const cls = String(ctx.intentClass ?? "").trim();
  if (!cls) return true; // прогон без фронта — узел работает безусловно
  return cls === mine;
}

/** Как `servesClass`, но для узла, обслуживающего НЕСКОЛЬКО классов (напр. склады пишут не для всякого). */
export function servesAnyClass(ctx: Record<string, unknown>, mine: readonly string[]): boolean {
  const cls = String(ctx.intentClass ?? "").trim();
  if (!cls) return true;
  return mine.includes(cls);
}

/**
 * КЛАССЫ, ПОСЛЕ КОТОРЫХ ПРОГОН ОСТАВЛЯЕТ ЗАПИСЬ. Общий список для всех складов — иначе каждый склад
 * заводил бы свой (в v2 их было два, с одинаковым содержимым и разной судьбой).
 *   `record-given`   — данные принесены человеком, их надо сохранить;
 *   `fetch-external` — данные добыты снаружи, сохраняем добытое;
 *   `composite`      — составной запрос: часть его результата тоже оседает записью;
 *   `continuation`   — ответ на висящий вопрос дополняет придержанную запись.
 * Вопросы (`read-own`), самоописание, отказ, вежливость и неопознанное записи НЕ создают: спросить —
 * не значит сохранить.
 */
export const RECORDING_CLASSES = ["record-given", "fetch-external", "composite", "continuation"] as const;

/**
 * СЕРЕДИНА ПОГАСИЛА СКЛАДЫ — общий флаг для ВСЕХ складов (шаг 311.7, дефект пойман живым прогоном).
 * Класс может оставлять запись «вообще», а конкретный прогон — не иметь ЧТО записать: добыча не нашла
 * предмет, придержана запись до подтверждения человека и т.п. Тогда середина ставит `skipStores`, и ни
 * один склад не пишет. Раньше такого общего флага не было, и при неудачной добыче в базу оседал сам
 * текст вопроса.
 */
export function storesSkipped(ctx: Record<string, unknown>): boolean {
  return ctx.skipStores === true;
}

export function matchHook(text: string, phrases: readonly string[]): { payload: string; phrase: string } | null {
  const clean = text.replace(/\s+/g, " ").trim();
  const folded = foldHook(clean);
  for (const raw of phrases) {
    const phrase = raw.replace(/\s+/g, " ").trim();
    if (!phrase) continue;
    // Свёртка сохраняет длину (регистр и ё→е — 1:1, пробелы уже схлопнуты), поэтому срез оригинала по
    // длине фразы совпадает с концом совпавшего префикса.
    if (folded.startsWith(foldHook(phrase))) {
      const payload = clean.slice(phrase.length).replace(/^[\s,:.!?—–-]+/, "").trim();
      return { payload, phrase };
    }
  }
  return null;
}
