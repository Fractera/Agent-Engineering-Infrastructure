import { DevSlot } from "../../shared/dev-slot";
import { DevNotifications } from "../../shared/dev-slot.client";

// АДМИНИСТРАТИВНАЯ ПОЛОВИНА сущности «уведомления» (стандарт папки-вкладки: index=композиция, public/, admin/).
// Именно admin/ подключает АДМИНИСТРАТИВНЫЙ СЛОЙ (`_shared-v2`) через fail-silent дев-слот: провайдер (единый
// источник поводов из ядра) + сама полоса. Нет `_shared-v2` — полосы нет, продакшн не задет.
//
// Вся суть уведомления (деривация ядра, провайдер, полоса, словарь) переехала в микросервис
// `_shared-v2/components/notifications/{client,server,types}`; в папке автоматизации — только этот тонкий монтаж.
export default function NotificationsAdmin({ lang }: { lang: string }) {
  return (
    <DevSlot>
      <DevNotifications lang={lang} />
    </DevSlot>
  );
}
