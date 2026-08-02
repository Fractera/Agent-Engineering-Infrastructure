import { DevSlot } from "../../shared/dev-slot";
import { DevDiagram } from "../../shared/dev-slot.client";

// АДМИНИСТРАТИВНАЯ ПОЛОВИНА диаграммы — ТОНКИЙ МОНТАЖ (шаг 298).
//
// 🔒 Весь холст, его кнопки и адаптер `graph → вью-модель` живут ОДНОЙ копией в административном слое
// `_shared-v2/components/diagram` и одинаковы для всех автоматизаций в любом аккаунте. Здесь — только
// подключение через fail-silent дев-слот. Данные холст читает сам через дверь `api/core`.
//
// Агенту-кодеру править код диаграммы ЗАПРЕЩЕНО (AGENTS.md, «Two surfaces are not yours to code»): он меняет только `graph.nodes`/
// `graph.edges` в ядре, а вид следует за данными сам. Это и делает автоматизацию переиспользуемой.
export default function DiagramCanvas({ lang, readOnly }: { lang: string; readOnly?: boolean }) {
  return (
    <DevSlot>
      <DevDiagram lang={lang} readOnly={readOnly} />
    </DevSlot>
  );
}
