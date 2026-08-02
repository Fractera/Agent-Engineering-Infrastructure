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
