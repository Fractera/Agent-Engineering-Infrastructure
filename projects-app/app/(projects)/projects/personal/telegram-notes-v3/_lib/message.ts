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
  // ВЛОЖЕНИЯ (шаг 308.2) — не-текстовый вход. `photoFileId` — id самого большого PhotoSize (чек/фото;
  // скачивается через Telegram getFile в узлах-навыках 308.3/308.5). `placeTitle` — имя места из шаринга
  // локации (venue). Координаты живут в `lat`/`lng` выше. Их проносит ВХОДНОЙ узел канала; середина
  // (классификатор, digitizeMoney, гео) читает их из контекста — не из ключей (закон 3).
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
 * INTENT-САМО-ГЕЙТ (шаг 308.0) — «моё ли это намерение?». Так ОДНА автоматизация делает всё: узел
 * `classifyIntent` ставит `ctx.intent` (мульти-флаг), а каждый узел-действие в начале спрашивает
 * `servesIntent(ctx, 'save')` и, если не его флаг, пропускает поток без изменений (`return {}`), НЕ
 * останавливая цепочку (иначе линейный движок убил бы соседние ветки).
 *
 * 🔒 ОБРАТНАЯ СОВМЕСТИМОСТЬ: если `ctx.intent` не задан (простой стартер «захват→развозка» без
 * классификатора) — возвращает `true`, и узел работает КАК РАНЬШЕ. Классификатор — опция v3, не налог
 * на простой стартер.
 */
export function servesIntent(ctx: Record<string, unknown>, mine: string): boolean {
  const intent = ctx.intent;
  if (!Array.isArray(intent)) return true; // нет классификатора — узел работает безусловно (простой стартер)
  return intent.map(String).includes(mine);
}

/** Как `servesIntent`, но для узла, обслуживающего НЕСКОЛЬКО намерений (напр. склады: save|finance|place, но не recall). */
export function servesAnyIntent(ctx: Record<string, unknown>, mine: readonly string[]): boolean {
  const intent = ctx.intent;
  if (!Array.isArray(intent)) return true; // нет классификатора — работает безусловно
  const set = new Set(intent.map(String));
  return mine.some((i) => set.has(i));
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
