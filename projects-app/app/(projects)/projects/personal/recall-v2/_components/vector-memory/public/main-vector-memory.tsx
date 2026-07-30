import MainVectorMemoryClient from "./main-vector-memory.client";

// ПУБЛИЧНАЯ ПОЛОВИНА векторной памяти — таблица записей-фактов. `mode="view"` (витрина) — только чтение;
// `mode="admin"` (кокпит) — со столбцом удаления. Добавление записи приходит отдельно, Кокпит-инструментом
// через dev-slot (см. `admin/ai-request`).
export default function MainVectorMemory({ lang, mode }: { lang: string; mode: "view" | "admin" }) {
  return <MainVectorMemoryClient lang={lang} mode={mode} />;
}
