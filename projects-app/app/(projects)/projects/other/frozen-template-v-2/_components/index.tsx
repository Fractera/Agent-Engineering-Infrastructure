import { loadAutomation } from "../_data/load";
import type { Surface } from "./surface";
import { ChevronDownIcon } from "./chrome/icons";
import { graphToFlow } from "./diagram/graph-to-flow";
import { DiagramCanvasV2 } from "./diagram/canvas.client";
import DashboardTable from "./dashboard/table";
import ControlPanel from "./control-panel";
import AutoRefresh from "./shared/auto-refresh.client";

// СЕКЦИИ НА ХОЛСТЕ — серия аккордеонов, дизайн взят из v1 (`automation-accordions.client.tsx`:
// контейнер `rounded-lg border px-4`, каждый item — `border-b`, триггер с шевроном), воспроизведён
// самодостаточно через стилизованный <details> (работает и без JS; закон 0 — код внутри папки).
//
// ПРИСУТСТВИЕ секции связано с переключателем в гамбургер-меню: он пишет `tab.presence` в ядро
// (absent = секции нет; иначе — закрытый аккордеон на холсте). Одно ядро читают ОБЕ поверхности —
// админ и публичная — поэтому набор секций у них одинаковый и правится из меню без пересборки.
//
// Аккордеон рождается ЗАКРЫТЫМ и пока ПУСТ внутри: содержимое секций придёт отдельными шагами. ИСКЛЮЧЕНИЕ —
// секция `diagram`: её содержимое (read-only канвас графа) уже готово и рисуется из ядра automation.json.
// Обе поверхности (admin и public) читают ОДНО ядро → диаграмма видна и в кокпите, и на витрине.
export default async function AutomationComponents({ surface, lang }: { surface: Surface; lang: string }) {
  const { components, graph } = await loadAutomation();
  const tabs = components.tabs.filter((tab) => tab.presence !== "absent");
  if (tabs.length === 0) return null;

  const flow = graphToFlow(graph);

  // ПУЛЬТ НА ВИТРИНЕ НЕ АККОРДЕОН (образец v1): под героем идёт ФОРМА ЗАЯВКИ — то, ради чего посетитель
  // пришёл, а не строка списка, которую надо догадаться раскрыть. В кокпите пульт остаётся первым
  // аккордеоном наравне с остальными вкладками: там это рабочий инструмент, а не призыв.
  const landingPanel = surface === "public" ? tabs.find((t) => t.name === "control-panel") : undefined;
  const series = landingPanel ? tabs.filter((t) => t !== landingPanel) : tabs;

  return (
    <>
      {/* ЗАКОН СТРАНИЦЫ, а не забота отдельной секции: завершился прогон — серверные данные перечитываются,
          и каждая таблица показывает свежие записи БЕЗ перезагрузки. Монтируется один раз на все вкладки,
          поэтому новая секция получает автообновление даром. */}
      <AutoRefresh />

      {landingPanel ? (
        <div className="mt-6">
          <ControlPanel surface={surface} entities={landingPanel.entities} lang={lang} />
        </div>
      ) : null}

      {series.length === 0 ? null : (
    <div data-components-root data-surface={surface} className="mt-6 rounded-lg border px-4">
      {series.map((tab) => (
        // a native <details>: presence управляет начальным состоянием — collapsed закрыт, expanded открыт;
        // раскрытие/схлопывание кликом работает и без JavaScript
        <details key={tab.name} data-tab={tab.name} open={tab.presence === "expanded"} className="group border-b last:border-b-0">
          <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-medium hover:underline [&::-webkit-details-marker]:hidden">
            <span className="capitalize">{tab.name.replace(/-/g, " ")}</span>
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="pb-4 pt-0 text-sm text-muted-foreground">
            {tab.name === "control-panel" ? (
              /* пульт запуска — своя папка с маршрутизатором: публичная половина (по одному пульту на
                 entity вкладки) + административная настройка запроса под ней */
              <ControlPanel surface={surface} entities={tab.entities} lang={lang} />
            ) : tab.name === "diagram" ? (
              <DiagramCanvasV2 vm={flow} lang={lang} readOnly={surface === "public"} />
            ) : tab.name === "dashboard" ? (
              <DashboardTable lang={lang} />
            ) : (
              /* пусто на этом этапе — содержимое секции появится позже */
              null
            )}
          </div>
        </details>
      ))}
    </div>
      )}
    </>
  );
}
