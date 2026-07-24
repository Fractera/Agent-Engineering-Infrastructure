import type { Entity } from "../../_data/automation.schema";
import type { Surface } from "../surface";
import MainAnalytics from "./public/main-analytics";
import AnalyticsAiRequest from "./admin/ai-request";

// МАРШРУТИЗАТОР АНАЛИТИКИ — та же тройка index/public/admin, что у всех продуктовых поверхностей v2.
//
// Аналитика — ПРОДУКТОВАЯ ПОВЕРХНОСТЬ (есть заявка «строить вместе с ИИ»): вся её логика — два графика за
// неделю (число запросов и суммарная стоимость акций по дням, из живых строк истории) — живёт в `public/`,
// где агент читает и правит её по техзаданию. В `admin/` — только форма заявки.
export default function Analytics({
  surface,
  entities,
  lang,
}: {
  surface: Surface;
  entities: Entity[];
  lang: string;
}) {
  return (
    <div data-entity="analytics" data-surface={surface} className="space-y-3">
      <MainAnalytics lang={lang} />
      {surface === "admin" ? <AnalyticsAiRequest entities={entities} lang={lang} /> : null}
    </div>
  );
}
