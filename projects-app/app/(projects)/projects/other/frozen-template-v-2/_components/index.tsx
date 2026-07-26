import { loadAutomation } from "../_data/load";
import { entitiesOf } from "../_data/automation.schema";
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

// СЕКЦИИ НА ХОЛСТЕ — поверхность одна, кокпит (шаг 300: `?view=public`/`surface` удалены как v1-остаток):
// серия аккордеонов (дизайн v1): вкладка = раздел, presence из ядра задаёт, раскрыт он при первом заходе
// или свёрнут. Дальше решает ВЛАДЕЛЕЦ: что он раскрыл или свернул, помнит браузер
// (`shared/sections-state.ts`) отдельно для каждой автоматизации, и перезагрузка это не стирает.
// Справа от заголовка — счётчик сущностей внутри. `absent` — секции нет вовсе.
export default async function AutomationComponents({ lang }: { lang: string }) {
  // `graph` здесь НЕ читается: диаграмма — платформенный вид, она берёт граф сама через `api/core`.
  const { components, useCases } = await loadAutomation();
  const tabs = components.tabs.filter((tab) => tab.presence !== "absent");
  // ⚠ БЕЗ раннего `return null` при пустых вкладках: секция ПОЛЬЗОВАТЕЛЬСКИХ КЕЙСОВ рисуется ВСЕГДА
  // (решение владельца) и НЕ зависит от вкладок. Владелец может отключить все аккордеоны в меню — кейсы
  // всё равно остаются последней секцией страницы. Пустой ряд вкладок просто не рисует свой контейнер.

  const S = sectionsStrings(lang);
  // ТАКТ РАСПИСАНИЯ читается ЗДЕСЬ ОДИН РАЗ — композиция страницы и есть то единственное место, которое
  // видит все вкладки сразу (лезть из одной вкладки в объявление другой запрещено). Дальше он раздаётся
  // не пропом, а ПРОВАЙДЕРОМ (`shared/cron-context`): такт — общий сигнал автоматизации, и потребителей у
  // него будет больше (сегодня календарь и полоса-пульс, завтра хранилище, дайджест, новая вкладка).
  const cron = cronOf(components);

  const bodyOf = (tab: (typeof tabs)[number]) =>
    tab.name === "control-panel" ? (
      <ControlPanel entities={entitiesOf(tab)} lang={lang} />
    ) : tab.name === "diagram" ? (
      // Диаграмма — платформенный вид: холст живёт в `_shared-v2`, данные он читает сам из ядра.
      <Diagram lang={lang} />
    ) : tab.name === "dashboard" ? (
      <Dashboard entities={entitiesOf(tab)} lang={lang} />
    ) : tab.name === "calendar" ? (
      <Calendar entities={entitiesOf(tab)} lang={lang} />
    ) : tab.name === "cron" ? (
      <Cron entities={entitiesOf(tab)} lang={lang} />
    ) : tab.name === "map" ? (
      <Map entities={entitiesOf(tab)} lang={lang} />
    ) : tab.name === "analytics" ? (
      <Analytics entities={entitiesOf(tab)} lang={lang} />
    ) : tab.name === "storage" ? (
      <Storage entities={entitiesOf(tab)} lang={lang} />
    ) : tab.name === "database" ? (
      <Database entities={entitiesOf(tab)} lang={lang} />
    ) : tab.name === "vector-memory" ? (
      <VectorMemory entities={entitiesOf(tab)} lang={lang} />
    ) : (
      // У вкладки ещё нет своей папки — показываем её сущности общим видом: место на странице, якорь для
      // оглавления и обе ступени заявки «строить вместе с ИИ». Пропускать раздел нельзя: тогда заказать
      // его разработку негде.
      <GenericTab tab={tab.name} entities={entitiesOf(tab)} lang={lang} />
    );

  const titleOf = (name: string) => name.replace(/-/g, " ");

  return (
    <CronProvider cron={cron}>
      {/* ЗАКОН СТРАНИЦЫ, а не забота отдельной секции: завершился прогон — серверные данные перечитываются,
          и каждая таблица показывает свежие записи БЕЗ перезагрузки. Монтируется один раз на все вкладки. */}
      <AutoRefresh />
      {tabs.length > 0 ? (
        <div data-components-root className="mt-6 rounded-lg border px-4">
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
        <UseCases cases={useCases.cases} lang={lang} />
      </section>
    </CronProvider>
  );
}
