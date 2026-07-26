import { DevSlot } from "../../shared/dev-slot";
import { DevWarnings } from "../../shared/dev-slot.client";

// АДМИНИСТРАТИВНАЯ ПОЛОВИНА сущности «предупреждения» (стандарт папки: index=композиция, public/, admin/).
// Именно admin/ подключает АДМИНИСТРАТИВНЫЙ СЛОЙ (`_shared-v2`) через fail-silent дев-слот: провайдер
// (единый источник открытых проблем из ядра) + Центр проблем. Нет `_shared-v2` — центра нет, продакшн цел.
//
// Вся суть (деривация ядра, провайдер, панель, словарь) живёт в микросервисе
// `_shared-v2/components/warnings/{client,server,types}`; здесь — только тонкий монтаж.
export default function WarningsAdmin({ lang }: { lang: string }) {
  return (
    <DevSlot>
      <DevWarnings lang={lang} />
    </DevSlot>
  );
}
