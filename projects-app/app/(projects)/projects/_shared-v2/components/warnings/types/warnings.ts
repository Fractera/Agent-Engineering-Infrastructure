// ТИПЫ микросервиса «предупреждения» (Центр проблем) — ДЕВ-СЛОЙ (`_shared-v2`). Автоматизация-агностичны:
// структурная форма ядра, а не импорт схемы конкретной автоматизации.

/** Одно предупреждение агента, привязанное к объекту ядра. `name` — человеческое имя объекта. */
export type WarningRow = {
  scope: "node" | "tab" | "entity" | "use-cases";
  name: string;
  cuid: string;
  text: string;
};

type CoreWarn = { cuid: string; text: string };
type CoreNode = { name: string; warnings: CoreWarn[] };
type CoreEntity = { name: string; warnings: CoreWarn[] };
type CoreTab = { name: string; warnings: CoreWarn[]; entities: CoreEntity[] };

export type WarningsCore = {
  graph: { nodes: { groups: { input?: { nodes: CoreNode[] }; middle?: { nodes: CoreNode[] }; output?: { nodes: CoreNode[] } } } };
  components: { tabs: CoreTab[] };
  useCases: { warnings: CoreWarn[] };
};
