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
// Вкладка несёт ЛИБО массив `entities`, ЛИБО один `entity` (singleton, закон владельца 2026-07-25) — читатель
// берёт их через `coreEntitiesOf`, форма ему невидима.
type CoreTab = { name: string; warnings: CoreWarn[]; entities?: CoreEntity[]; entity?: CoreEntity };

/** Единообразное чтение сущностей вкладки: массив как есть, либо singleton-объект в массиве из одного, либо []. */
export function coreEntitiesOf(tab: CoreTab): CoreEntity[] {
  return tab.entities ?? (tab.entity ? [tab.entity] : []);
}

export type WarningsCore = {
  graph: { nodes: { groups: { input?: { nodes: CoreNode[] }; middle?: { nodes: CoreNode[] }; output?: { nodes: CoreNode[] } } } };
  components: { tabs: CoreTab[] };
  useCases: { warnings: CoreWarn[] };
};
