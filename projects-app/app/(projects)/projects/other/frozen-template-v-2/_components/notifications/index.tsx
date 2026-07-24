import type { Surface } from "../surface";
import NotificationsAdmin from "./admin/notifications";

// МАРШРУТИЗАТОР сущности «уведомления» — та же тройка index/public/admin, что у всех сущностей v2.
//
// 🔒 ОСОБЕННОСТЬ: публичная половина ПУСТА (папка `public/` есть, кода нет). Полоса-уведомление — внутренняя
// правда для владельца о состоянии сборки; посетителю витрины показывать нечего. Раскладка public/admin
// сохранена ради ЕДИНОЙ системы разделения слоёв.
//
// Вся суть (деривация ядра, провайдер-единый-источник, полоса, словарь) живёт в микросервисе
// `_shared-v2/components/notifications`; здесь — только тонкий монтаж через `admin/` (дев-слот).
export default function Notifications({ surface, lang }: { surface: Surface; lang: string }) {
  if (surface !== "admin") return null; // публичной половины нет — на витрине не рисуется
  return <NotificationsAdmin lang={lang} />;
}
