// ЯДРО → ДИАГРАММА. Чистая серверная функция: разворачивает граф из automation.json (три группы узлов
// + рёбра, соединённые по cuid) в плоскую вью-модель, которую рисует канвас. Никакой БД и никакого
// polling — в отличие от канваса v1, который берёт рёбра из БД-дерева, здесь единственный источник
// истины — само ядро (закон 0: папка самодостаточна, канвас скопирован под её данные).
//
// РАСКЛАДКА — по ГРУППАМ, а не по глубине рёбер: в замороженном шаблоне почти все узлы — скрытые двери
// без рёбер, и раскладка по рёбрам разбросала бы их как корни. Столбец = группа (вход | середина |
// выход), строка = порядок внутри группы. Так три плоскости архитектуры читаются сразу, а реальные рёбра
// (control-panel → Logic → If success → dashboard) прочерчивают рабочий путь поверх скелета.
import type { Automation } from "../../_data/automation.schema";

export type DiagramVMNode = {
  id: string; // cuid — идентичность узла
  name: string;
  description: string;
  kind: string; // input-connector | input | transform | condition-success | condition-failure | output | output-connector
  ioType: string | null;
  group: "input" | "middle" | "output";
  col: number; // столбец раскладки (0 вход · 1 середина · 2 выход)
  row: number; // строка внутри столбца
  isCondition: boolean; // condition-* → рисуется квадратом
  isConnector: boolean; // *-connector → дверь в соседнюю автоматизацию
  hidden: boolean; // state === "hidden" — скелет замороженного шаблона
  fn: { name: string; summary: string; accepts: string; returns: string };
};

export type DiagramVMEdge = { id: string; from: string; to: string; hidden: boolean };

export type DiagramVM = { nodes: DiagramVMNode[]; edges: DiagramVMEdge[] };

// Колонка = ранг по ПОТОКУ, а не просто группа: вход(0) → transform(1) → condition(2) → output(3).
// Так рёбра `input → transform → condition → output` читаются строго слева направо, без петель. Условия
// живут в группе «середина», но в потоке стоят ПОСЛЕ transform — поэтому им отдельная колонка справа от него.
function colOf(group: "input" | "middle" | "output", kind: string): number {
  if (group === "input") return 0;
  if (group === "output") return 3;
  return kind === "transform" ? 1 : 2;
}

export function graphToFlow(graph: Automation["graph"]): DiagramVM {
  const groups = graph.nodes.groups;
  const nodes: DiagramVMNode[] = [];
  const rowByCol = new Map<number, number>();

  for (const group of ["input", "middle", "output"] as const) {
    for (const n of groups[group].nodes) {
      const col = colOf(group, n.kind);
      const row = rowByCol.get(col) ?? 0;
      rowByCol.set(col, row + 1);
      nodes.push({
        id: n.cuid,
        name: n.name,
        description: n.description,
        kind: n.kind,
        ioType: typeof n.ioType === "string" ? n.ioType : null,
        group,
        col,
        row,
        isCondition: n.kind === "condition-success" || n.kind === "condition-failure",
        isConnector: n.kind === "input-connector" || n.kind === "output-connector",
        hidden: n.state === "hidden",
        fn: {
          name: n.function.name,
          summary: n.function.summary,
          accepts: n.function.accepts,
          returns: n.function.returns,
        },
      });
    }
  }

  const edges: DiagramVMEdge[] = graph.edges.map((e) => ({
    id: e.cuid,
    from: e.from,
    to: e.to,
    hidden: e.state === "hidden",
  }));

  return { nodes, edges };
}
