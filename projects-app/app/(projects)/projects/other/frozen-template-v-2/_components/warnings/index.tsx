import type { Surface } from "../surface";
import WarningsAdmin from "./admin/warnings";

// МАРШРУТИЗАТОР сущности «предупреждения» (Центр проблем) — та же тройка index/public/admin, что у всех
// сущностей v2.
//
// 🔒 ОСОБЕННОСТЬ: публичная половина ПУСТА (папка `public/` есть, кода нет). Предупреждение агента —
// внутренняя правда владельца о ходе разработки; посетителю витрины её показывать нечего. Раскладка
// public/admin сохранена ради ЕДИНОЙ системы разделения слоёв.
//
// Вся суть (деривация ядра, провайдер-единый-источник, панель, словарь) живёт в микросервисе
// `_shared-v2/components/warnings`; здесь — только тонкий монтаж через `admin/` (дев-слот).
export default function Warnings({ surface, lang }: { surface: Surface; lang: string }) {
  if (surface !== "admin") return null; // публичной половины нет — на витрине не рисуется
  return <WarningsAdmin lang={lang} />;
}
