// ЯДРО → ДИАГРАММА. Чистая серверная функция: разворачивает граф из automation.json (три группы узлов
// + рёбра, соединённые по cuid) в плоскую вью-модель, которую рисует канвас. Никакой БД и никакого
// polling — в отличие от канваса v1, который берёт рёбра из БД-дерева, здесь единственный источник
// истины — само ядро (закон 0: папка самодостаточна, канвас скопирован под её данные).
//
// РАСКЛАДКА — по ПОТОКУ (см. colOf ниже): вход(0) → transform(1) → condition(2) → выход(3), поэтому
// рёбра читаются строго слева направо, без петель.
//
// ЗДЕСЬ НЕ ФИЛЬТРУЮТ. Адаптер отдаёт ВЕСЬ инвентарь — и видимые узлы, и скрытые двери — а решает, что
// показать, канвас: в обычном режиме он оставляет только видимое, в режиме строительства показывает
// скрытое бледно-фиолетовым. Причина разделения: режим — состояние КЛИЕНТА (кнопка на холсте), и если
// фильтровать на сервере, переключение режима требовало бы нового запроса вместо мгновенной перерисовки.
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
  // ВЫХОДНЫЕ ИНТЕГРАЦИИ узла — ключи каналов, в которые он умеет отправлять СВЕРХ своего назначения
  // (шаг 292). Непустой список бывает только там, где вкладка того же имени объявила интеграции:
  // сегодня это календарь. Структура графа от них не меняется — узла не прибавляется, ребра не
  // прибавляется; меняется только то, что на узле НАПИСАНО.
  integrations: string[];
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

/**
 * ИНТЕГРАЦИИ ПО ИМЕНИ ВКЛАДКИ. Канал узла (`ioType`) и имя вкладки — одно и то же слово: выходной узел
 * `calendar` и вкладка `calendar` описывают одну сущность с двух сторон (граф и страница). Поэтому
 * бейджи узла выводятся, а не объявляются второй раз: включённые интеграции вкладки И ЕСТЬ выходные
 * интеграции её узла.
 */
function integrationsByTab(components?: Automation["components"]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const tab of components?.tabs ?? []) {
    const keys = new Set<string>();
    for (const entity of tab.entities) {
      const raw = (entity.data as Record<string, unknown>).integrations;
      if (!Array.isArray(raw)) continue;
      for (const i of raw) {
        const d = i as { key?: unknown; enabled?: unknown };
        if (typeof d.key === "string" && d.key && d.enabled !== false) keys.add(d.key);
      }
    }
    if (keys.size) map.set(tab.name, [...keys]);
  }
  return map;
}

export function graphToFlow(graph: Automation["graph"], components?: Automation["components"]): DiagramVM {
  const groups = graph.nodes.groups;
  const nodes: DiagramVMNode[] = [];
  const rowByCol = new Map<number, number>();
  const byTab = integrationsByTab(components);

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
        // только у выхода: «входная интеграция» — это уже другой канал, а не бейдж на двери
        integrations: group === "output" && typeof n.ioType === "string" ? byTab.get(n.ioType) ?? [] : [],
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
