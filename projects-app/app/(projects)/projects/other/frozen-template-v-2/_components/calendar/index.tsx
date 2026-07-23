import type { Entity } from "../../_data/automation.schema";
import type { Surface } from "../surface";
import type { CronSettings } from "../cron/schedule";
import MainCalendar from "./public/main-calendar";
import CalendarSettings from "./admin/calendar-settings";
import SectionAccordion from "../shared/section-accordion.client";
import BuildWithAi from "../shared/build-with-ai.client";
import { pick } from "../shared/localized";

// МАРШРУТИЗАТОР КАЛЕНДАРЯ — не переключатель, а композиция: рисует две половины друг под другом.
// Публичная половина сверху — её видят все. Административная под ней — её берёт только админ-слой.
//
// КАРТА ПАПКИ (чтобы модель открывала ровно то, что ей нужно):
//   public/    — сами календари, по файлу на календарь, + public/components/ общие для них части
//                (загрузчик записей, сетка месяца, дневной планер);
//   admin/     — настройка календарей, + admin/components/ свои части;
//   i18n.ts    — словарь вкладки на десять языков; entries.ts — чтение объявления календаря из ядра.
//
// СКОЛЬКО КАЛЕНДАРЕЙ — РЕШАЕТ ЯДРО: по одному на каждую entity вкладки `calendar`. Имя файла = kebab
// имени entity («Main calendar» → `public/main-calendar.tsx`), реестр статический — тот же закон, что у
// пульта, дашборда и функций узлов: имя есть АДРЕС файла.
//
// ДВА КАЛЕНДАРЯ — ДВА ВЛОЖЕННЫХ АККОРДЕОНА (правило владельца 2026-07-22): один календарь показывается
// как есть, а начиная со второго каждый получает свой аккордеон внутри главного; первый раскрыт,
// остальные свёрнуты, состояние каждого помнит браузер. НА ВИТРИНЕ аккордеонов нет вовсе: там всё
// раскрыто всегда, как диаграмма.
//
// ТАКТ РАСПИСАНИЯ ПРИХОДИТ СВЕРХУ и насквозь уходит в каждый календарь. Он объявлен в ДРУГОЙ вкладке
// (`cron`), поэтому читает его композиция страницы (`_components/index.tsx`), а не календарь: лезть из
// одной вкладки в объявление другой значило бы завести второй источник истины о такте.
const CALENDARS: Record<
  string,
  React.ComponentType<{ entity: Entity; cron: CronSettings | null; surface: Surface; lang: string; heading?: boolean }>
> = {
  "main-calendar": MainCalendar,
};

const fileOf = (name: string) => name.trim().toLowerCase().replace(/\s+/g, "-");

export default function Calendar({
  surface,
  entities,
  cron,
  lang,
}: {
  surface: Surface;
  entities: Entity[];
  cron: CronSettings | null;
  lang: string;
}) {
  const many = entities.length > 1;
  const landing = surface === "public";

  return (
    <div data-entity="calendar" data-surface={surface} className="divide-y">
      {entities.map((entity, i) => {
        const Cal = CALENDARS[fileOf(entity.name)];
        const title = pick((entity.data as Record<string, unknown>).title, lang) || entity.name;
        const nested = many && !landing; // имя стоит в шапке вложенного аккордеона
        const pending = "crudUser" in entity.info ? entity.info.crudUser : undefined;
        // ЗАЯВКА НА ОДИН КАЛЕНДАРЬ — свой адрес в ядре (entity) и своё имя в заголовке раскрывашки.
        const body = Cal ? (
          <div className="space-y-3">
            <Cal entity={entity} cron={cron} surface={surface} lang={lang} heading={!nested} />
            {surface === "admin" ? (
              <BuildWithAi target={{ object: "entity", tab: "calendar", cuid: entity.cuid }} name={title} pending={pending} lang={lang} />
            ) : null}
          </div>
        ) : (
          // ядро объявило календарь, файла под него нет — говорим прямо, а не показываем пустоту
          <p className="py-2 text-sm text-rose-700 dark:text-rose-400">{entity.name}</p>
        );

        // якорь для навигации публичной страницы — по нему прокручивает ящик слева
        return (
          <div key={entity.cuid} id={`entity-${entity.cuid}`} className="scroll-mt-20 py-3 first:pt-0 last:pb-0">
            {nested ? (
              <SectionAccordion tab="calendar" cuid={entity.cuid} title={title} defaultOpen={i === 0}>
                {body}
              </SectionAccordion>
            ) : (
              body
            )}
          </div>
        );
      })}
      {surface === "admin" ? (
        <>
          <CalendarSettings entities={entities} lang={lang} />
          {/* ЗАЯВКА НА ВЕСЬ КАЛЕНДАРЬ — объект tab, отдельно от заявок на отдельные календари. */}
          <BuildWithAi target={{ object: "tab", name: "calendar" }} name="calendar" lang={lang} />
        </>
      ) : null}
    </div>
  );
}
