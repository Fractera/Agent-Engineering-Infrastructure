// ТИПЫ микросервиса «уведомления» — ДЕВ-СЛОЙ (`_shared-v2`). Автоматизация-агностичны: структурная форма
// ядра (только то, что читает деривация), а НЕ импорт схемы конкретной автоматизации — микросервис один на
// все автоматизации.

export type NoticeCategory = "unbuilt" | "warning" | "new-case" | "ready" | "answered";
export type NoticeScope = "node" | "tab" | "entity" | "use-cases" | "case";

/** Один повод внимания. `name` — человеческое имя объекта (или номер кейса); `text` — текст предупреждения
 *  либо текст кейса, как их написал автор (проза, НЕ переводится). */
export type Notice = {
  category: NoticeCategory;
  scope: NoticeScope;
  name: string;
  text?: string;
};

// ── СТРУКТУРНАЯ ФОРМА ЯДРА — ровно то, что читает `collectNotices`. Дверь `api/projects/notices` парсит
//    ядро автоматизации и передаёт его сюда; микросервис не знает про конкретную схему. ──────────────────
export type CoreInfo = { crudUser?: string; aiSummary?: string };
export type CoreNode = { name: string; state: string; status: string; warnings: { text: string }[]; info?: CoreInfo };
export type CoreEntity = { name: string; status: string; warnings: { text: string }[]; info?: CoreInfo };
// Вкладка ядра несёт ЛИБО массив `entities` (многосущностная), ЛИБО один `entity` (singleton — хранилище,
// векторная память, страницы приложения; закон владельца 2026-07-25). Оба поля опциональны, читатель берёт
// их через `coreEntitiesOf` — форма (массив/объект) ему невидима, микросервис остаётся автоматизация-агностичным.
export type CoreTab = { name: string; presence: string; status: string; warnings: { text: string }[]; entities?: CoreEntity[]; entity?: CoreEntity; info?: CoreInfo };

/** Единообразное чтение сущностей вкладки: массив как есть, либо singleton-объект в массиве из одного, либо []. */
export function coreEntitiesOf(tab: CoreTab): CoreEntity[] {
  return tab.entities ?? (tab.entity ? [tab.entity] : []);
}
export type CoreUseCase = { cuid: string; number: number; title: string; text: string; status: string };

export type NoticesCore = {
  graph: { nodes: { groups: { input?: { nodes: CoreNode[] }; middle?: { nodes: CoreNode[] }; output?: { nodes: CoreNode[] } } } };
  components: { tabs: CoreTab[] };
  useCases: { warnings: { text: string }[]; cases: CoreUseCase[]; reviewedSignature?: string };
};
