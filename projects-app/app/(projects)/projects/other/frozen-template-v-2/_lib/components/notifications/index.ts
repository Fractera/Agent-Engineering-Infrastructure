// ФУНКЦИИ СУЩНОСТИ «NOTIFICATION» — вся работа полосы-уведомления, которая не является разметкой:
// сбор объектов ядра, требующих внимания владельца. Компонент только показывает результат
// (закон ARCHITECTURE.md §`_lib/`).
//
// ЧТО ЭТО ЗА ПОЛОСА. Перенос сущности из v1 (шаг 297): в первой версии под шапкой каждой автоматизации
// стояло уведомление о волне разработки. В v2 шагов разработки в продукте НЕТ (решение владельца), поэтому
// уведомление отслеживает НЕ волну, а САМИ ОБЪЕКТЫ `automation.json`. Ничего не хранит — чистая деривация
// ядра (закон 2: единственный источник истины — ядро). Читается на единственной точке чтения платформы
// (`page.tsx`) и уходит вниз пропсом.
//
// ТРИ КАТЕГОРИИ ВНИМАНИЯ:
//   warning   — у объекта непустой `warnings[]`: агент остановился и сказал владельцу (канал эскалации,
//               роль Центра проблем v1). Важен, где бы объект ни стоял.
//   unbuilt   — объект ВЫВЕДЕН на страницу, но ещё в разработке. Только видимые узлы и присутствующие
//               вкладки/сущности: скрытые заготовки каналов — инвентарь дверей, а не недоделка, иначе
//               полоса шумела бы на каждой автоматизации.
//   new-case  — пользовательский кейс со статусом `new`: заявка, которую ещё не начали.
import { allNodes, type Automation } from "../../../_data/automation.schema";

export type NoticeCategory = "unbuilt" | "warning" | "new-case";
export type NoticeScope = "node" | "tab" | "entity" | "use-cases" | "case";

/** Один повод внимания. `name` — человеческое имя объекта (или номер кейса); `text` — текст предупреждения
 *  либо текст кейса, как их написал автор (проза, НЕ переводится). */
export type Notice = {
  category: NoticeCategory;
  scope: NoticeScope;
  name: string;
  text?: string;
};

/** Собрать все поводы внимания из ядра. Порядок: сначала предупреждения (важнее всего), затем недоделанное,
 *  затем новые кейсы — так же группирует и полоса. Ничего не читает с диска: чистая функция над ядром. */
export function collectNotices(core: Automation): Notice[] {
  const warnings: Notice[] = [];
  const unbuilt: Notice[] = [];
  const newCases: Notice[] = [];

  const nodes = allNodes(core.graph.nodes);

  // WARNINGS — a warning matters wherever it lives, visible or not.
  for (const node of nodes) {
    for (const w of node.warnings) warnings.push({ category: "warning", scope: "node", name: node.name, text: w.text });
  }
  for (const tab of core.components.tabs) {
    for (const w of tab.warnings) warnings.push({ category: "warning", scope: "tab", name: tab.name, text: w.text });
    for (const entity of tab.entities) {
      for (const w of entity.warnings) warnings.push({ category: "warning", scope: "entity", name: entity.name, text: w.text });
    }
  }
  for (const w of core.useCases.warnings) {
    warnings.push({ category: "warning", scope: "use-cases", name: "use-cases", text: w.text });
  }

  // UNBUILT — only what the owner has actually SURFACED and has not finished yet.
  for (const node of nodes) {
    if (node.state === "visible" && node.status === "in-development") {
      unbuilt.push({ category: "unbuilt", scope: "node", name: node.name });
    }
  }
  for (const tab of core.components.tabs) {
    if (tab.presence === "absent") continue; // turned off — not pending work
    if (tab.status === "in-development") unbuilt.push({ category: "unbuilt", scope: "tab", name: tab.name });
    for (const entity of tab.entities) {
      if (entity.status === "in-development") unbuilt.push({ category: "unbuilt", scope: "entity", name: entity.name });
    }
  }

  // NEW CASES — a scenario the owner wrote but development has not started on.
  for (const useCase of core.useCases.cases) {
    if (useCase.status === "new") {
      newCases.push({ category: "new-case", scope: "case", name: String(useCase.number), text: useCase.text });
    }
  }

  return [...warnings, ...unbuilt, ...newCases];
}
