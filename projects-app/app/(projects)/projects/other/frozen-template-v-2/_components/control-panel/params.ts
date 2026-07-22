import type { Entity } from "../../_data/automation.schema";

// ПОЛЯ ПУЛЬТА — единственное место, где читается объявление формы из ядра. Обе половины (публичная и
// административная) берут поля отсюда, поэтому расходятся они не могут: одно объявление — один читатель.
//
// Форма объявлена в `entity.data.params` (как дашборд объявляет колонки таблицы), а не в коде: добавили
// поле через дверь api/patch — оно появилось в пульте и в настройке без пересборки.
export type Param = {
  key: string;
  type?: "text" | "longtext" | "number";
  required?: boolean;
  label?: unknown;
  placeholder?: unknown;
};

export const paramsOf = (entity: Entity): Param[] => {
  const raw = (entity.data as Record<string, unknown>).params;
  return Array.isArray(raw) ? (raw as Param[]) : [];
};

/** Текст ядра — либо строка, либо карта языков; берётся язык страницы (см. `pick` в i18n). */
export const dataText = (entity: Entity, key: string): unknown => (entity.data as Record<string, unknown>)[key];
