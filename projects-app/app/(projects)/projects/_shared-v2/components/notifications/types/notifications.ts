// ТИПЫ микросервиса «уведомления» — ДЕВ-СЛОЙ (`_shared-v2`). Автоматизация-агностичны: структурная форма
// ядра (только то, что читает деривация), а НЕ импорт схемы конкретной автоматизации — микросервис один на
// все автоматизации.

export type NoticeCategory = "unbuilt" | "warning" | "new-case" | "ready";
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
export type CoreNode = { name: string; state: string; status: string; warnings: { text: string }[] };
export type CoreEntity = { name: string; status: string; warnings: { text: string }[] };
export type CoreTab = { name: string; presence: string; status: string; warnings: { text: string }[]; entities: CoreEntity[] };
export type CoreUseCase = { cuid: string; number: number; title: string; text: string; status: string };

export type NoticesCore = {
  graph: { nodes: { groups: { input?: { nodes: CoreNode[] }; middle?: { nodes: CoreNode[] }; output?: { nodes: CoreNode[] } } } };
  components: { tabs: CoreTab[] };
  useCases: { warnings: { text: string }[]; cases: CoreUseCase[]; reviewedSignature?: string };
};
