import { loadAutomation } from "../_data/load";
import type { Surface } from "./surface";
import { ChevronDownIcon } from "./chrome/icons";

// СЕКЦИИ НА ХОЛСТЕ — серия аккордеонов, дизайн взят из v1 (`automation-accordions.client.tsx`:
// контейнер `rounded-lg border px-4`, каждый item — `border-b`, триггер с шевроном), воспроизведён
// самодостаточно через стилизованный <details> (работает и без JS; закон 0 — код внутри папки).
//
// ПРИСУТСТВИЕ секции связано с переключателем в гамбургер-меню: он пишет `tab.presence` в ядро
// (absent = секции нет; иначе — закрытый аккордеон на холсте). Одно ядро читают ОБЕ поверхности —
// админ и публичная — поэтому набор секций у них одинаковый и правится из меню без пересборки.
//
// Аккордеон рождается ЗАКРЫТЫМ и пока ПУСТ внутри: содержимое секций придёт отдельными шагами.
export default async function AutomationComponents({ surface }: { surface: Surface }) {
  const { components } = await loadAutomation();
  const tabs = components.tabs.filter((tab) => tab.presence !== "absent");
  if (tabs.length === 0) return null;

  return (
    <div data-components-root data-surface={surface} className="mt-6 rounded-lg border px-4">
      {tabs.map((tab) => (
        // a native <details>: presence управляет начальным состоянием — collapsed закрыт, expanded открыт;
        // раскрытие/схлопывание кликом работает и без JavaScript
        <details key={tab.name} data-tab={tab.name} open={tab.presence === "expanded"} className="group border-b last:border-b-0">
          <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-medium hover:underline [&::-webkit-details-marker]:hidden">
            <span className="capitalize">{tab.name.replace(/-/g, " ")}</span>
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          {/* пусто на этом этапе — содержимое секции появится позже */}
          <div className="pb-4 pt-0 text-sm text-muted-foreground" />
        </details>
      ))}
    </div>
  );
}
