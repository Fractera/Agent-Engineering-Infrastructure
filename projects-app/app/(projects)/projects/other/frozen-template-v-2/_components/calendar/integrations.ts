import type { Entity } from "../../_data/automation.schema";

// КАТАЛОГ ИНТЕГРАЦИЙ КАЛЕНДАРЯ — единственное место, где он читается из ядра. Выпадающий список в
// шапке, иконки на строках, ящик правки, бейджи на диаграмме — все берут его отсюда.
//
// ЧТО ТАКОЕ ИНТЕГРАЦИЯ. Календарь сам по себе умеет ровно одно: показать тост в момент наступления
// (закон `_instructions/tab.calendar.md`). Интеграция — объявленная возможность отправить это же
// наступившее событие НАРУЖУ. В ядре объявлено, ЧТО календарь умеет подключать и какой формы объект
// уходит в каждый канал; ЧЕМ именно наполнен объект у конкретной записи — лежит в самой записи
// (`row.integrations`), а не здесь: у тысячи событий тысяча разных писем.
//
// ⚠ ОТПРАВКИ ПОКА НЕТ. Этот слой объявляет, показывает и даёт править. Наружу ничего не уходит: у
// календарной двери нет функции, у каналов нет ключей. Не принимать пустой канал за поломку.

/** ПОЛЕ объекта, который уйдёт в канал: ключ, тип ввода и подпись на языках. */
export type IntegrationField = { key: string; type?: "text" | "longtext"; label?: unknown };

/** ИНТЕГРАЦИЯ: ключ канала, подпись, включена ли она у этого календаря, и форма её объекта. */
export type Integration = { key: string; label?: unknown; enabled: boolean; fields: IntegrationField[] };

export function integrationsOf(entity: Entity): Integration[] {
  const raw = (entity.data as Record<string, unknown>).integrations;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((i) => {
      const d = i as Partial<Integration>;
      return {
        key: String(d.key ?? ""),
        label: d.label,
        enabled: d.enabled !== false,
        fields: Array.isArray(d.fields) ? (d.fields as IntegrationField[]) : [],
      };
    })
    .filter((i) => Boolean(i.key));
}

/** Только подключённые — то, что рисуется иконками на строках и бейджами на диаграмме. */
export const enabledOf = (list: Integration[]): Integration[] => list.filter((i) => i.enabled);
