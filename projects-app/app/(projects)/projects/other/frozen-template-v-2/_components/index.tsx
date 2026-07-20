import type { ComponentType } from "react";
import { loadAutomation } from "../_data/load";
import type { Surface } from "./surface";

// ОБЩИЙ МАРШРУТИЗАТОР АВТОМАТИЗАЦИИ.
// Состав вкладок он НЕ знает и не хранит: читает его из ядра (`_data/automation.json`) и по имени
// вкладки берёт код из папки того же имени. Списка вкладок в коде нет — есть только один список,
// в ядре. Состояние вкладки решает всё: absent — не рисуем, collapsed — схлопнутой, expanded — раскрытой.
export default async function AutomationComponents({ surface }: { surface: Surface }) {
  const { components } = await loadAutomation();

  const tabs = await Promise.all(
    components.tabs
      .filter((tab) => tab.presence !== "absent")
      .map(async (tab) => {
        // the folder name IS the tab name — no registry of tabs anywhere in the code
        const mod = (await import(`./${tab.name}/index`)) as {
          default: ComponentType<{ surface: Surface }>;
        };
        return { ...tab, Component: mod.default };
      }),
  );

  return (
    <div data-components-root data-surface={surface} className="space-y-3">
      {tabs.map(({ name, presence, Component }) => (
        // a native <details>: folding works with JavaScript switched off
        <details key={name} data-tab={name} data-presence={presence} open={presence === "expanded"}>
          <summary className="cursor-pointer text-sm font-medium capitalize">{name}</summary>
          <Component surface={surface} />
        </details>
      ))}
    </div>
  );
}
