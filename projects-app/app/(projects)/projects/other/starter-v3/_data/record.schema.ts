import { z } from "zod";

// СХЕМА СТРОКИ СКЛАДА — форма того, что автоматизация ПРОИЗВОДИТ (шаг 311.9а.2).
//
// ПОЧЕМУ ОТДЕЛЬНЫЙ ФАЙЛ, А НЕ ВНУТРИ `automation.schema.ts`. Тот описывает ОДИН файл — `automation.json`,
// то есть чем автоматизация ЯВЛЯЕТСЯ: паспорт, граф, компоненты, кейсы, история. Строки складов — не
// объявление, а продукт прогонов. Два разных факта — два файла; слить их значит получить схему, которая
// описывает уже не один файл (тот же приём, что развёл закон вкладки и закон кейсов).
//
// ЧТО ЭТО ЗАКРЫВАЕТ. До этого шага строка была `{ id, table, createdAt, updatedAt? } & Record<string,
// unknown>` — то есть НИЧЕМ. Самая систематическая структура проекта (запись сделки и связи между
// складами) была единственной без объявленной формы, и именно поэтому связи спокойно разъехались в два
// представления: `links` и поля-на-соседа `storageIds`/`vectorIds`.

/** Ссылка на строку другого склада. Единая форма для ЛЮБОЙ связи — новый склад не требует нового поля. */
export const LinkSchema = z
  .object({
    table: z.string().min(1, "a link names the table it points at"),
    id: z.string().min(1, "a link names the row it points at"),
  })
  .strict();

/**
 * КОНВЕРТ ЛЮБОЙ СТРОКИ — то, что несёт строка независимо от того, какой склад её создал.
 *
 * `.passthrough()` намеренный: поля СОДЕРЖАНИЯ у каждого склада свои (у метки — координаты, у события —
 * дата и время, у файла — ключ и размер), и пинить их здесь значило бы решать за автоматизацию, сколько
 * у неё таблиц и что в них. Схема держит ОБЩЕЕ: идентичность, время и связи.
 */
export const RowEnvelopeSchema = z
  .object({
    id: z.string().min(1, "a row must carry an id"),
    table: z.string().min(1, "a row must name its table"),
    createdAt: z.string().min(1, "a row must carry the moment it was born"),
    updatedAt: z.string().optional(),
    deleted: z.boolean().optional(),
    links: z.array(LinkSchema).default([]),
  })
  .passthrough();

export type Link = z.infer<typeof LinkSchema>;
export type RowEnvelope = z.infer<typeof RowEnvelopeSchema>;

/** Предел саммари — тот же, что применяет запись (`_lib/summary.ts`). Объявлен здесь, чтобы схема могла отказать. */
export const SUMMARY_LIMIT = 300;

// ─── КОНВЕРТ РЕПЛИКИ ДИАЛОГА (шаг 330.3) ────────────────────────────────────────────────────────────
//
// 🔴 ЗАЧЕМ. Реплика была ГОЛОЙ СТРОКОЙ с временем, и модель видела разговор без последствий: два
// сообщения назад прогон кончился `unreachable` — она об этом не знала и отвечала так, будто всё
// получилось. Человек-то помнит, что бот ошибся; ассистент, перечитывающий свою же переписку, — нет.
// Отсюда самый обидный род ответов: уверенное продолжение поверх провала.
//
// ЧТО НЕСЁТ КОНВЕРТ: чем прогон был (`class`), чем кончился (`outcome`), что после себя оставил
// (`links`) и каким прогоном это было (`runId` — по нему конверт и запечатывается).
//
// 🔒 ИСХОД ПРОСТАВЛЯЕТ ДВИЖОК, А НЕ РЕЧЬ — И ЭТО НЕ ВТОРОЙ АВТОР. Речь по закону портов стоит ДО выхода:
// когда она говорит, ни один склад ещё не отработал, и «что создал прогон» ей неизвестно физически.
// Требовать конверт от неё значит требовать знать будущее. Поэтому реплику РОЖДАЕТ речь (текст, класс,
// время — единственный автор состояния диалога, закон 312.3), а движок в конце прогона ЗАПЕЧАТЫВАЕТ уже
// рождённую реплику фактом её исхода — ровно как `updatedAt` проставляет запись, а не её автор.
export const TURN_OUTCOMES = ["ok", "refused", "missing", "unreachable", "failed"] as const;
export type TurnOutcome = (typeof TURN_OUTCOMES)[number];

export const TurnSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    text: z.string(),
    at: z.string().min(1, "a turn carries the moment it was said"),
    /** Прогон, в котором реплика родилась: адрес для запечатывания. */
    runId: z.string().optional(),
    /** Класс запроса, которым прогон себя объявил (словарь слоя намерения). */
    class: z.string().optional(),
    /** Чем прогон кончился. Пусто = ещё не запечатан (речь сказала, прогон не завершился). */
    outcome: z.enum(TURN_OUTCOMES).optional(),
    /** Что прогон оставил в складах сущностей. Пусто — законно: спросить не значит сохранить. */
    links: z.array(LinkSchema).optional(),
  })
  .strict();

export type Turn = z.infer<typeof TurnSchema>;

// ─── СТРОКА ДОЛГОЙ ПАМЯТИ РАЗГОВОРА (шаг 330.5) ─────────────────────────────────────────────────────
//
// 🔴 ЗАЧЕМ ВТОРОЙ ДОМ У ОДНОЙ РЕПЛИКИ. Векторная память общая на весь сервер: туда пишут ВСЕ автоматизации,
// и по ответу «да, мы это обсуждали» невозможно понять, обсуждали ли это ЗДЕСЬ. Локальная таблица решает
// именно это — она лежит внутри папки автоматизации, поэтому принадлежность в ней не может соврать.
// Вектор отвечает за СМЫСЛ («о чём был разговор»), таблица — за ПРИНАДЛЕЖНОСТЬ и точный текст.
//
// 🔒 ЭТО НЕ СКЛАД СУЩНОСТЕЙ. `ENTITY_STORES` хранят то, ЧЕМ автоматизация владеет, и пишут только для
// классов-записей: спросить — не значит сохранить. Разговор ведётся ВСЕГДА, независимо от класса, поэтому
// он третий род — не сущность и не журнал прогона. `mayWriteEntity` к нему не применяется, и это не
// послабление закона, а признание, что закон про другое.
export const ConversationTurnSchema = z
  .object({
    text: z.string().min(1, "an empty line is not a conversation turn"),
    role: z.enum(["user", "assistant"]),
    /** Канал, в котором это было сказано, и собеседник — по ним же фасетируется поиск. */
    channel: z.string().min(1, "a remembered turn names the channel it was said in"),
    chatKey: z.string().min(1, "a remembered turn names whose conversation it belongs to"),
    at: z.string().min(1, "a remembered turn carries the moment it was said"),
    runId: z.string().optional(),
    /** Что ответила векторная память на ингест. Пусто — памяти на этом сервере нет, строка всё равно жива. */
    trackId: z.string().optional(),
    /** Наш маркер `[mem#id]` внутри текста документа: по нему выдержка разрешается обратно в эту строку. */
    memRecordId: z.string().optional(),
  })
  .passthrough();

export type ConversationTurn = z.infer<typeof ConversationTurnSchema>;

/** Проверка строки разговора перед записью. Отказывает словами — как конверт строки и реплика диалога. */
export function parseConversationTurn(row: unknown): void {
  const parsed = ConversationTurnSchema.safeParse(row);
  if (!parsed.success) {
    const why = parsed.error.issues.map((i) => `${i.path.join(".") || "row"}: ${i.message}`).join("; ");
    throw new Error(`a remembered conversation turn must obey its law before it may be stored — ${why}`);
  }
}

/**
 * Проверка реплики перед записью в состояние чата. Отказывает СЛОВАМИ — тот же обучающий отказ, что у
 * конверта строки: незаконная реплика не ложится в память диалога.
 */
export function parseTurn(turn: unknown): Turn {
  const parsed = TurnSchema.safeParse(turn);
  if (!parsed.success) {
    const why = parsed.error.issues.map((i) => `${i.path.join(".") || "turn"}: ${i.message}`).join("; ");
    throw new Error(`a dialogue turn must obey the turn law before it may be remembered — ${why}`);
  }
  return parsed.data;
}

/**
 * СКЛАДЫ-ЗАПИСИ — те, чья строка описывает СУЩНОСТЬ и потому обязана нести короткую форму. Метка на карте
 * и событие календаря сущность не описывают, они её ГРАНИ: у них своя форма (координаты, дата), и саммари
 * им не нужно.
 */
export const RECORD_TABLES = ["database", "vector-memory"] as const;

/**
 * 🔒 ЗАПИСЬ ВСЕГДА НЕСЁТ САММАРИ И НИКОГДА — ПОЛНЫЙ ТЕКСТ (шаг 311.9а.4, решение владельца).
 * Полный текст живёт в поисковом индексе, и только там. Проверка машинная: пока правило жило прозой,
 * один и тот же текст лежал в трёх местах.
 */
export const RecordFieldsSchema = z
  .object({
    name: z.string().min(1, "a record must carry a name"),
    summary: z
      .string()
      .min(1, "a record always carries a summary — for a short source it simply equals the source")
      .max(SUMMARY_LIMIT, `a summary is at most ${SUMMARY_LIMIT} characters: the full text belongs to the search index, not to a store`),
  })
  .passthrough();

export const isRecordTable = (table: string): boolean => (RECORD_TABLES as readonly string[]).includes(table);

/** Проверка полей записи. Отказывает словами — как и конверт. */
export function parseRecordFields(row: unknown): void {
  const parsed = RecordFieldsSchema.safeParse(row);
  if (!parsed.success) {
    const why = parsed.error.issues.map((i) => `${i.path.join(".") || "row"}: ${i.message}`).join("; ");
    throw new Error(`a record row must obey the record law before it may be stored — ${why}`);
  }
}

/**
 * Проверка конверта перед записью. Отказывает СЛОВАМИ — тот же обучающий отказ, что у `api/patch`:
 * незаконная строка не ложится в склад, а вызывающий узнаёт, что именно не так.
 */
export function parseEnvelope(row: unknown): RowEnvelope {
  const parsed = RowEnvelopeSchema.safeParse(row);
  if (!parsed.success) {
    const why = parsed.error.issues.map((i) => `${i.path.join(".") || "row"}: ${i.message}`).join("; ");
    throw new Error(`a row must obey the envelope law before it may be stored — ${why}`);
  }
  return parsed.data;
}

/**
 * 🔒 ЕДИНСТВЕННОЕ ПРЕДСТАВЛЕНИЕ СВЯЗЕЙ — читается отсюда, а не из полей-на-соседа.
 *
 * `storageIds` / `vectorIds` были ВТОРЫМ домом того же факта: под каждого нового соседа требовалось новое
 * поле, и календарь это доказал — он появился в `links` и не появился в «массивах строк». Поэтому связи
 * ХРАНЯТСЯ один раз в `links`, а вид «ссылки на такой-то склад» ВЫВОДИТСЯ при чтении.
 *
 * Второй аргумент (`legacy`) — строки, записанные до этого шага: у них связей в `links` нет, и брать их
 * неоткуда, кроме старого поля. Это мост для уже накопленных данных, а не второй источник.
 */
export function linksOf(row: Record<string, unknown>, table: string, legacy?: unknown): string[] {
  const links = Array.isArray(row.links) ? (row.links as Link[]) : [];
  const derived = links.filter((l) => l && l.table === table && l.id).map((l) => String(l.id));
  if (derived.length) return derived;
  return Array.isArray(legacy) ? legacy.map(String).filter(Boolean) : [];
}
