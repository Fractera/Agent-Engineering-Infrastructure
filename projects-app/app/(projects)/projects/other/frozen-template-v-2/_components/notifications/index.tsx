import type { Surface } from "../surface";
import type { Notice } from "../../_lib/components/notifications";
import NotificationBanner from "./admin/notification-banner.client";

// МАРШРУТИЗАТОР СУЩНОСТИ «NOTIFICATION» — та же единая раскладка, что у всех сущностей v2 (эталон
// `calendar/index.tsx`): у сущности есть публичная и административная половина, и маршрутизатор их
// СКЛАДЫВАЕТ (публичная сверху, административная под ней).
//
// 🔒 ОСОБЕННОСТЬ ЭТОЙ СУЩНОСТИ: публичная половина ПУСТА (папка `public/` есть, но кода в ней нет).
// Уведомление о состоянии сборки — внутренняя правда для владельца, посетителю витрины показывать её
// нечего. Поэтому весь код живёт в `admin/`, а раскладка public/admin сохранена ради ЕДИНОЙ системы
// разделения слоёв: у Notification она устроена так же, как у календаря, а не особым случаем.
//
// Список поводов внимания считает `_lib/components/notifications` на единственной точке чтения платформы
// (`page.tsx`) и передаёт сюда готовым — компонент только показывает (закон 2: ничего не хранит).
export default function Notifications({ surface, notices, lang }: { surface: Surface; notices: Notice[]; lang: string }) {
  // Публичной половины нет — на витрине сущность не рисуется вовсе.
  if (surface !== "admin") return null;
  return <NotificationBanner notices={notices} lang={lang} />;
}
