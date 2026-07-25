import MainDatabaseClient from "./main-database.client";

// ПУБЛИЧНАЯ ПОЛОВИНА локальной базы — таблица записей. `mode="view"` (витрина) — только чтение;
// `mode="admin"` (кокпит) — со столбцом удаления. Добавление строки приходит отдельно, Кокпит-инструментом
// через dev-slot (см. `admin/ai-request`).
export default function MainDatabase({ lang, mode }: { lang: string; mode: "view" | "admin" }) {
  return <MainDatabaseClient lang={lang} mode={mode} />;
}
