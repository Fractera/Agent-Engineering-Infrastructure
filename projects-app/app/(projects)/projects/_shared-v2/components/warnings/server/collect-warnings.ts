import type { WarningRow, WarningsCore } from "../types/warnings";

// СЕРВЕРНАЯ ДЕРИВАЦИЯ микросервиса «предупреждения» — ЕДИНЫЙ ИСТОЧНИК открытых проблем: собирает все
// `warnings[]` с объектов ядра (узлы, вкладки, сущности, кейсы) в плоский список с человеческим именем
// объекта. Чистая функция над ядром (закон 2). Её зовёт дверь `api/projects/warnings`, а провайдер раздаёт
// результат ОДИН РАЗ Центру проблем — так предупреждение показывается из одного места, без расхождений.
export function collectWarnings(core: WarningsCore): WarningRow[] {
  const out: WarningRow[] = [];
  const nodes = [
    ...(core.graph.nodes.groups.input?.nodes ?? []),
    ...(core.graph.nodes.groups.middle?.nodes ?? []),
    ...(core.graph.nodes.groups.output?.nodes ?? []),
  ];
  for (const n of nodes) for (const w of n.warnings) out.push({ scope: "node", name: n.name, cuid: w.cuid, text: w.text });
  for (const tab of core.components.tabs) {
    for (const w of tab.warnings) out.push({ scope: "tab", name: tab.name, cuid: w.cuid, text: w.text });
    for (const e of tab.entities) for (const w of e.warnings) out.push({ scope: "entity", name: e.name, cuid: w.cuid, text: w.text });
  }
  for (const w of core.useCases.warnings) out.push({ scope: "use-cases", name: "use-cases", cuid: w.cuid, text: w.text });
  return out;
}
