import { DevSlot } from "../../shared/dev-slot";
import { DevUseCasesPanel } from "../../shared/dev-slot.client";

// АДМИНИСТРАТИВНАЯ ПОЛОВИНА вкладки кейсов (стандарт папки-вкладки: index=композиция, public/, admin/).
// Именно admin/ подключает АДМИНИСТРАТИВНЫЙ СЛОЙ (`_shared-v2`) — здесь через fail-silent дев-слот
// (`shared/dev-slot` → `_shared-v2/components/use-cases`): кнопка «Настроить», режимы настройки/подтверждения
// и Quiz создания кейсов. Нет `_shared-v2` — ничего не рисуется, публичный список кейсов остаётся.
//
// Публичную половину (read-only список) admin НЕ повторяет — её рисует `public/`, а эта половина лишь
// добавляет управление под ней (тот же приём, что у calendar/dashboard: public сверху, настройка снизу).
export default function UseCasesSettings() {
  return (
    <DevSlot>
      <DevUseCasesPanel />
    </DevSlot>
  );
}
