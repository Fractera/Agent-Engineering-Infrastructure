import MainStorageClient from "./main-storage.client";

// ПУБЛИЧНАЯ ПОЛОВИНА склада — таблица объектов (перенос закона дашборда на склад). `mode="view"` (витрина)
// — только чтение; `mode="admin"` (кокпит) — со столбцом удаления. Добавление-с-crop приходит отдельно,
// Кокпит-инструментом через dev-slot (см. `admin/ai-request`).
export default function MainStorage({ lang, mode }: { lang: string; mode: "view" | "admin" }) {
  return <MainStorageClient lang={lang} mode={mode} />;
}
