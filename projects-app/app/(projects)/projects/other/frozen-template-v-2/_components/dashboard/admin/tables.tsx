import { DevSlot } from "../../shared/dev-slot";
import { DevDashboard, DevDashboardSettings } from "../../shared/dev-slot.client";

// АДМИНИСТРАТИВНАЯ ПОЛОВИНА дашборда — ТОНКИЙ МОНТАЖ (шаг 298, перенос таблицы v1 «max copy»).
//
// Универсальная таблица (8 типов колонок, действия строки, live-lookup, дебаунс-поиск, пагинация, выбор
// колонок с памятью браузера), разделённый вид «одна/две таблицы» и админ-хром (добавить / править по клику
// / удалить) живут ОДНОЙ копией в `_shared-v2/components/dashboard` — как и в v1, где вид, админ и мост
// лежали рядом. Конфиг таблиц она читает из ядра (`api/core`), строки — из двери `api/rows`.
//
// Ниже таблицы — настройка: какие колонки объявлены в ядре.
export default function DashboardTables({ lang }: { lang: string }) {
  return (
    <DevSlot>
      <DevDashboard lang={lang} mode="admin" />
      <DevDashboardSettings lang={lang} />
    </DevSlot>
  );
}
