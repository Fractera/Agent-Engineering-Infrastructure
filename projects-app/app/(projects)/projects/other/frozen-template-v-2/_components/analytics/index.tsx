import type { Surface } from "../surface";
import AnalyticsPublic from "./public";
import AnalyticsAdmin from "./admin";

// МАРШРУТИЗАТОР АНАЛИТИКИ — та же схема: публичная половина сверху, административная под ней.
export default function Analytics({ surface }: { surface: Surface }) {
  return (
    <div data-entity="analytics" data-surface={surface}>
      <AnalyticsPublic />
      {surface === "admin" ? <AnalyticsAdmin /> : null}
    </div>
  );
}
