import type { Entity } from "../../../_data/automation.schema";
import History from "./history";

// ВТОРАЯ ТАБЛИЦА — ВРЕМЕННЫЙ ДУБЛЬ первой, заведённый ради проверки вложенных аккордеонов (владелец,
// 2026-07-22). Удаляется вместе со своей entity в ядре, как только проверка пройдена.
//
// Состав таблицы полностью описан в ядре (`entity.data`), поэтому дубль — это ссылка на тот же вид, а не
// копия разметки: копировать было бы нечего, кроме ошибки.
export default function SecondTable({ entity, lang }: { entity: Entity; lang: string }) {
  return <History entity={entity} lang={lang} />;
}
