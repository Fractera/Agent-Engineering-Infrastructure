import type { Surface } from "../surface";
import CalendarPublic from "./first-calendar";
import CalendarAdmin from "./admin";

// МАРШРУТИЗАТОР КАЛЕНДАРЯ — не переключатель, а композиция: рисует две половины друг под другом.
// Публичная половина сверху — её видят все. Административная под ней — её берёт только админ-слой.
export default function Calendar({ surface }: { surface: Surface }) {
  return (
    <div data-entity="calendar" data-surface={surface}>
      <CalendarPublic />
      {surface === "admin" ? <CalendarAdmin /> : null}
    </div>
  );
}
