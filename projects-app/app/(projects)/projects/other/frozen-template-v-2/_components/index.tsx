import { loadAutomation } from "../_data/load";
import type { Surface } from "./surface";
import { graphToFlow } from "./diagram/graph-to-flow";
import { DiagramCanvasV2 } from "./diagram/canvas.client";
import Dashboard from "./dashboard";
import ControlPanel from "./control-panel";
import Calendar from "./calendar";
import Cron from "./cron";
import { cronOf } from "./cron/schedule";
import GenericTab from "./generic";
import AutoRefresh from "./shared/auto-refresh.client";
import SectionAccordion from "./shared/section-accordion.client";
import { sectionsStrings } from "./shared/sections-i18n";

// СЕКЦИИ НА ХОЛСТЕ. Одно ядро читают ОБЕ поверхности, но показывают по-разному:
//
//   КОКПИТ (admin) — серия аккордеонов (дизайн v1): вкладка = раздел, presence из ядра задаёт, раскрыт
//     он при первом заходе или свёрнут. Дальше решает ВЛАДЕЛЕЦ: что он раскрыл или свернул, помнит
//     браузер (`shared/sections-state.ts`) отдельно для каждой автоматизации, и перезагрузка это не
//     стирает. Справа от заголовка — счётчик сущностей внутри.
//
//   ВИТРИНА (public) — АККОРДЕОНОВ НЕТ ВОВСЕ (правило владельца 2026-07-22): всё, что владелец выбрал
//     показывать, посетитель видит раскрытым, как диаграмму. Прятать от посетителя то, ради чего он
//     пришёл, за клик — значит терять его. Для перемещения по длинной странице служит ящик навигации
//     слева (гамбургер в шапке витрины).
//
// ПРИСУТСТВИЕ секции по-прежнему связано с переключателем в гамбургер-меню кокпита: `absent` — секции нет
// нигде, ни в кокпите, ни на витрине.
export default async function AutomationComponents({ surface, lang }: { surface: Surface; lang: string }) {
  const { components, graph } = await loadAutomation();
  const tabs = components.tabs.filter((tab) => tab.presence !== "absent");
  if (tabs.length === 0) return null;

  const S = sectionsStrings(lang);
  const flow = graphToFlow(graph, components);
  const landing = surface === "public";
  // ТАКТ РАСПИСАНИЯ читается ЗДЕСЬ и раздаётся тем вкладкам, которым он нужен. Он объявлен во вкладке
  // `cron`, а нужен календарю — и лезть из одной вкладки в объявление другой запрещено: композиция
  // страницы и есть то единственное место, которое видит все вкладки сразу.
  const cron = cronOf(components);

  // Содержимое вкладки — одно и то же на обеих поверхностях; отличается только обёртка.
  const bodyOf = (tab: (typeof tabs)[number]) =>
    tab.name === "control-panel" ? (
      <ControlPanel surface={surface} entities={tab.entities} lang={lang} />
    ) : tab.name === "diagram" ? (
      <DiagramCanvasV2 vm={flow} lang={lang} readOnly={landing} />
    ) : tab.name === "dashboard" ? (
      <Dashboard surface={surface} entities={tab.entities} lang={lang} />
    ) : tab.name === "calendar" ? (
      <Calendar surface={surface} entities={tab.entities} cron={cron} lang={lang} />
    ) : tab.name === "cron" ? (
      <Cron surface={surface} entities={tab.entities} lang={lang} />
    ) : (
      // У вкладки ещё нет своей папки — показываем её сущности общим видом: место на странице, якорь для
      // оглавления и обе ступени заявки «строить вместе с ИИ». Пропускать раздел нельзя: тогда заказать
      // его разработку негде.
      <GenericTab surface={surface} tab={tab.name} entities={tab.entities} lang={lang} />
    );

  const titleOf = (name: string) => name.replace(/-/g, " ");

  // ── ВИТРИНА: пульт первым, крупной формой заявки; ниже остальные разделы, все раскрытые.
  if (landing) {
    const panel = tabs.find((t) => t.name === "control-panel");
    const rest = tabs.filter((t) => t !== panel);
    return (
      <>
        <AutoRefresh />
        {panel ? <div className="mt-6">{bodyOf(panel)}</div> : null}
        {rest.map((tab) => {
          const body = bodyOf(tab);
          return (
            <section key={tab.name} data-tab={tab.name} className="mt-8 space-y-3 scroll-mt-20">
              <h2 className="text-lg font-semibold capitalize tracking-tight">{titleOf(tab.name)}</h2>
              {body}
            </section>
          );
        })}
      </>
    );
  }

  // ── КОКПИТ: серия аккордеонов, состояние каждого помнит браузер.
  return (
    <>
      {/* ЗАКОН СТРАНИЦЫ, а не забота отдельной секции: завершился прогон — серверные данные перечитываются,
          и каждая таблица показывает свежие записи БЕЗ перезагрузки. Монтируется один раз на все вкладки. */}
      <AutoRefresh />
      <div data-components-root data-surface={surface} className="mt-6 rounded-lg border px-4">
        {tabs.map((tab) => (
          <SectionAccordion
            key={tab.name}
            tab={tab.name}
            title={titleOf(tab.name)}
            count={tab.entities.length}
            countLabel={S.items}
            defaultOpen={tab.presence === "expanded"}
          >
            {bodyOf(tab)}
          </SectionAccordion>
        ))}
      </div>
    </>
  );
}
