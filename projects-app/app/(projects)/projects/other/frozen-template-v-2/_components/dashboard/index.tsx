import type { Entity } from "../../_data/automation.schema";
import type { Surface } from "../surface";
import DashboardTables from "./public/tables";
import DashboardAiRequest from "./admin/ai-request";

// МАРШРУТИЗАТОР ДАШБОРДА — та же тройка index/public/admin, что у всех сущностей v2.
//
// 🔒 ГЛАВНЫЙ ЗАКОН ЭТОЙ ВКЛАДКИ (владелец 2026-07-24, после разбора моей ошибки). Дашборд — НЕ платформенный
// вид, как диаграмма. У таблицы ЕСТЬ режим «строить вместе с ИИ»: владелец пишет техзадание, а агент читает
// ИСХОДНИКИ ЭТОЙ ПАПКИ и меняет таблицу — кладёт видео в колонку, собирает калькулятор внутри ячейки,
// добавляет свою логику. Значит:
//
//   ВСЯ ЛОГИКА ТАБЛИЦЫ ЖИВЁТ В `public/` — в зоне, которую агент имеет право и обязан развивать;
//   в `admin/` уходит ТОЛЬКО инструмент работы с ИИ — форма заявки, и всё.
//
// Держать таблицу в общем слое `_shared-v2` было бы фатально: агенту он запрещён, и заявка «сделай видео в
// колонке» стала бы невыполнимой, а таблица — одинаковой для всех автоматизаций вместо своей у каждой.
export default function Dashboard({
  surface,
  entities,
  lang,
}: {
  surface: Surface;
  entities: Entity[];
  lang: string;
}) {
  return (
    <div data-entity="dashboard" data-surface={surface} className="space-y-3">
      {/* ПУБЛИЧНАЯ ПОЛОВИНА — вся таблица целиком (перенос v1): типы колонок, действия строки, поиск,
          пагинация, выбор колонок, разделённый вид, правка строк. На витрине — только чтение. */}
      <DashboardTables lang={lang} mode={surface === "admin" ? "admin" : "view"} />
      {/* АДМИН-ПОЛОВИНА — только заявка ИИ на разработку таблиц. */}
      {surface === "admin" ? <DashboardAiRequest entities={entities} lang={lang} /> : null}
    </div>
  );
}
