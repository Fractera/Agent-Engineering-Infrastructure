import { loadAutomation } from "../_data/load";
import { entitiesOf } from "../_data/automation.schema";
import type { Surface } from "./surface";
import Diagram from "./diagram";
import Dashboard from "./dashboard";
import ControlPanel from "./control-panel";
import Calendar from "./calendar";
import Cron from "./cron";
import Map from "./map";
import Analytics from "./analytics";
import Storage from "./storage";
import Database from "./database";
import VectorMemory from "./vector-memory";
import { cronOf } from "./shared/schedule";
import GenericTab from "./generic";
import UseCases from "./use-cases";
import { useCasesSectionTitle } from "./use-cases/i18n";
import AutoRefresh from "./shared/auto-refresh.client";
import SectionAccordion from "./shared/section-accordion.client";
import { sectionsStrings } from "./shared/sections-i18n";
import { CronProvider } from "./shared/cron-context.client";

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
  // `graph` здесь больше НЕ читается: диаграмма — платформенный вид, она берёт граф сама через `api/core`.
  const { components, useCases } = await loadAutomation();
  const tabs = components.tabs.filter((tab) => tab.presence !== "absent");
  // ⚠ БЕЗ раннего `return null` при пустых вкладках: секция ПОЛЬЗОВАТЕЛЬСКИХ КЕЙСОВ рисуется ВСЕГДА
  // (решение владельца) и НЕ зависит от вкладок. Владелец может отключить все аккордеоны в меню — кейсы
  // всё равно остаются последней секцией страницы. Пустой ряд вкладок просто не рисует свой контейнер.

  const S = sectionsStrings(lang);
  const landing = surface === "public";
  // ТАКТ РАСПИСАНИЯ читается ЗДЕСЬ ОДИН РАЗ — композиция страницы и есть то единственное место, которое
  // видит все вкладки сразу (лезть из одной вкладки в объявление другой запрещено). Дальше он раздаётся
  // не пропом, а ПРОВАЙДЕРОМ (`shared/cron-context`): такт — общий сигнал автоматизации, и потребителей у
  // него будет больше (сегодня календарь и полоса-пульс, завтра хранилище, дайджест, новая вкладка).
  const cron = cronOf(components);

  // Содержимое вкладки — одно и то же на обеих поверхностях; отличается только обёртка.
  const bodyOf = (tab: (typeof tabs)[number]) =>
    tab.name === "control-panel" ? (
      <ControlPanel surface={surface} entities={entitiesOf(tab)} lang={lang} />
    ) : tab.name === "diagram" ? (
      // Диаграмма — платформенный вид: холст живёт в `_shared-v2`, данные он читает сам из ядра.
      <Diagram surface={surface} lang={lang} />
    ) : tab.name === "dashboard" ? (
      <Dashboard surface={surface} entities={entitiesOf(tab)} lang={lang} />
    ) : tab.name === "calendar" ? (
      <Calendar surface={surface} entities={entitiesOf(tab)} lang={lang} />
    ) : tab.name === "cron" ? (
      <Cron surface={surface} entities={entitiesOf(tab)} lang={lang} />
    ) : tab.name === "map" ? (
      <Map surface={surface} entities={entitiesOf(tab)} lang={lang} />
    ) : tab.name === "analytics" ? (
      <Analytics surface={surface} entities={entitiesOf(tab)} lang={lang} />
    ) : tab.name === "storage" ? (
      <Storage surface={surface} entities={entitiesOf(tab)} lang={lang} />
    ) : tab.name === "database" ? (
      <Database surface={surface} entities={entitiesOf(tab)} lang={lang} />
    ) : tab.name === "vector-memory" ? (
      <VectorMemory surface={surface} entities={entitiesOf(tab)} lang={lang} />
    ) : (
      // У вкладки ещё нет своей папки — показываем её сущности общим видом: место на странице, якорь для
      // оглавления и обе ступени заявки «строить вместе с ИИ». Пропускать раздел нельзя: тогда заказать
      // его разработку негде.
      <GenericTab surface={surface} tab={tab.name} entities={entitiesOf(tab)} lang={lang} />
    );

  const titleOf = (name: string) => name.replace(/-/g, " ");

  // ── ВИТРИНА: пульт первым, крупной формой заявки; ниже остальные разделы, все раскрытые.
  if (landing) {
    const panel = tabs.find((t) => t.name === "control-panel");
    const rest = tabs.filter((t) => t !== panel);
    return (
      <CronProvider cron={cron}>
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
        {/* ПОЛЬЗОВАТЕЛЬСКИЕ КЕЙСЫ — ВСЕГДА последняя секция, за сепаратором, ОТКРЫТА (решение владельца:
            не отслеживать раскрыт/скрыт). Единый `<UseCases>` (тройка index/public/admin); витрина =
            surface="public" → только публичный read-only список. */}
        {useCases.cases.length ? (
          <section data-section="use-cases" className="mt-10 scroll-mt-20 border-t pt-6">
            <h2 className="mb-3 text-lg font-semibold tracking-tight">{useCasesSectionTitle(lang)}</h2>
            <UseCases cases={useCases.cases} surface={surface} lang={lang} />
          </section>
        ) : null}
      </CronProvider>
    );
  }

  // ── КОКПИТ: серия аккордеонов, состояние каждого помнит браузер.
  return (
    <CronProvider cron={cron}>
      {/* ЗАКОН СТРАНИЦЫ, а не забота отдельной секции: завершился прогон — серверные данные перечитываются,
          и каждая таблица показывает свежие записи БЕЗ перезагрузки. Монтируется один раз на все вкладки. */}
      <AutoRefresh />
      {tabs.length > 0 ? (
        <div data-components-root data-surface={surface} className="mt-6 rounded-lg border px-4">
          {tabs.map((tab) => (
            <SectionAccordion
              key={tab.name}
              tab={tab.name}
              title={titleOf(tab.name)}
              count={entitiesOf(tab).length}
              countLabel={S.items}
              defaultOpen={tab.presence === "expanded"}
            >
              {bodyOf(tab)}
            </SectionAccordion>
          ))}
        </div>
      ) : null}
      {/* ПОЛЬЗОВАТЕЛЬСКИЕ КЕЙСЫ — ВСЕГДА последняя секция страницы, за сепаратором, ОТКРЫТА (решение
          владельца 2026-07-24: не отслеживать раскрыт/скрыт, всегда рисовать; кейсы живут в топ-уровневом
          `useCases`, не во вкладках). Единый `<UseCases>` (тройка index/public/admin): публичный список +
          админ-половина через дев-слот. Общий index НЕ монтирует DevSlot сам — это делает `use-cases/admin/`. */}
      <section data-section="use-cases" className="mt-10 border-t pt-6">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">{useCasesSectionTitle(lang)}</h2>
        <UseCases cases={useCases.cases} surface={surface} lang={lang} />
      </section>
    </CronProvider>
  );
}
