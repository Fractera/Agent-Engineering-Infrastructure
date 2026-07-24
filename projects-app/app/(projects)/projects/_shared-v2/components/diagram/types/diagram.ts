// ТИПЫ микросервиса «диаграмма» — ДЕВ-СЛОЙ (`_shared-v2`). Автоматизация-агностичны: структурная форма
// ровно того, что читает адаптер `graph-to-flow`, а НЕ импорт схемы конкретной автоматизации.
//
// 🔒 Диаграмма — ПЛАТФОРМЕННЫЙ ВИД над ядром, одна копия на все автоматизации (AGENTS.md §0a). Поэтому
// знать конкретную схему ей нельзя: она рисует ЛЮБОЕ ядро, пришедшее из двери `api/core`.

export type DiagramNodeFn = {
  name: string;
  summary: string;
  accepts: string;
  returns: string;
};

export type DiagramCoreNode = {
  cuid: string;
  name: string;
  description: string;
  kind: string;
  ioType: string | null;
  state: string;
  function: DiagramNodeFn;
};

export type DiagramCoreEdge = { cuid: string; from: string; to: string; state: string };

export type DiagramGraph = {
  nodes: { groups: { input: { nodes: DiagramCoreNode[] }; middle: { nodes: DiagramCoreNode[] }; output: { nodes: DiagramCoreNode[] } } };
  edges: DiagramCoreEdge[];
};

export type DiagramComponents = {
  tabs: { name: string; entities: { data: Record<string, unknown> }[] }[];
};
