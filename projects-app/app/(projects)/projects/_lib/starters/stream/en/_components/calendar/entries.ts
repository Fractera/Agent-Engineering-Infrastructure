import type { Entity } from "../../_data/automation.schema";

// ОБЪЯВЛЕНИЕ КАЛЕНДАРЯ — единственное место, где читается ядро. Обе половины (сам календарь и его
// настройка) берут отсюда и хранилище, и виды записей: одно объявление — один читатель, разойтись не
// могут. Тот же закон, что у `dashboard/columns.ts` и `control-panel/params.ts`.
//
// Здесь ТОЛЬКО чтение ядра. Работа календаря — приведение строк, раскладка месяца, слоты дня — живёт в
// `_lib/components/calendar/` (закон ARCHITECTURE.md: всё, что не разметка, уходит в `_lib`).

/** ВИД ЗАПИСИ: ключ из строки, подпись на языках и цвет, которым вид рисуется. */
export type Tone = "event" | "reminder";
export type EntryType = { key: string; label?: unknown; tone: Tone };

// ДВА ВИДА ПО УМОЛЧАНИЮ — ровно те, что были в v1 (синее событие, янтарное напоминание). Ядро может
// объявить свои: тогда авторитет у ядра. Умолчание существует, чтобы календарь, ничего не объявивший,
// выглядел как в первой версии, а не пустым.
export const DEFAULT_TYPES: EntryType[] = [
  { key: "event", tone: "event" },
  { key: "reminder", tone: "reminder" },
];

/** Ключ вида → цвет. Незнакомый вид рисуется как событие: цвет — оформление, а не повод не показать запись. */
const toneOf = (key: string): Tone => (key === "reminder" ? "reminder" : "event");

export function typesOf(entity: Entity): EntryType[] {
  const raw = (entity.data as Record<string, unknown>).types;
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_TYPES;
  return raw
    .map((t) => {
      if (typeof t === "string") return { key: t, tone: toneOf(t) };
      const declared = t as Partial<EntryType>;
      const key = String(declared.key ?? "");
      return { key, label: declared.label, tone: declared.tone ?? toneOf(key) };
    })
    .filter((t) => Boolean(t.key));
}

/** Имя таблицы в хранилище строк (_lib/rows.ts). Не объявлено — берём имя сущности. */
export const tableOf = (entity: Entity): string =>
  String((entity.data as Record<string, unknown>).table ?? entity.name).toLowerCase();
