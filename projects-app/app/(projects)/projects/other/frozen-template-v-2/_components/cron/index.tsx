import type { Entity } from "../../_data/automation.schema";
import type { Surface } from "../surface";
import MainSchedule from "./public/main-schedule";
import CronSettings from "./admin/cron-settings";
import SectionAccordion from "../shared/section-accordion.client";
import BuildWithAi from "../shared/build-with-ai.client";
import { pick } from "../shared/localized";

// МАРШРУТИЗАТОР РАСПИСАНИЯ — та же композиция, что у пульта, дашборда и календаря: публичная половина
// сверху, административная под ней.
//
// КАРТА ПАПКИ:
//   public/     — сами расписания, по файлу на расписание, + public/components/ (полоса-пульс);
//   admin/      — настройка такта, + admin/components/ (форма, единственное место записи);
//   i18n.ts     — словарь ×10; schedule.ts — чтение объявления такта из ядра.
//
// ЗАЧЕМ РАЗДЕЛ ВООБЩЕ СУЩЕСТВУЕТ: такт нужен не ему самому, а КАЛЕНДАРЮ — его сторож проверяет
// наступившие записи ровно в этом ритме. Поэтому выключенное расписание не косметика: оно означает,
// что напоминать некому.
const SCHEDULES: Record<string, React.ComponentType<{ entity: Entity; lang: string; heading?: boolean }>> = {
  "main-schedule": MainSchedule,
};

const fileOf = (name: string) => name.trim().toLowerCase().replace(/\s+/g, "-");

export default function Cron({
  surface,
  entities,
  lang,
}: {
  surface: Surface;
  entities: Entity[];
  lang: string;
}) {
  const many = entities.length > 1;
  const landing = surface === "public";

  return (
    <div data-entity="cron" data-surface={surface} className="divide-y">
      {entities.map((entity, i) => {
        const Schedule = SCHEDULES[fileOf(entity.name)];
        const title = pick((entity.data as Record<string, unknown>).title, lang) || entity.name;
        const nested = many && !landing;
        const pending = "crudUser" in entity.info ? entity.info.crudUser : undefined;
        const body = Schedule ? (
          <div className="space-y-3">
            <Schedule entity={entity} lang={lang} heading={!nested} />
            {surface === "admin" ? (
              <BuildWithAi target={{ object: "entity", tab: "cron", cuid: entity.cuid }} name={title} pending={pending} lang={lang} />
            ) : null}
          </div>
        ) : (
          <p className="py-2 text-sm text-rose-700 dark:text-rose-400">{entity.name}</p>
        );

        return (
          <div key={entity.cuid} id={`entity-${entity.cuid}`} className="scroll-mt-20 py-3 first:pt-0 last:pb-0">
            {nested ? (
              <SectionAccordion tab="cron" cuid={entity.cuid} title={title} defaultOpen={i === 0}>
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
          <CronSettings entities={entities} lang={lang} />
          <BuildWithAi target={{ object: "tab", name: "cron" }} name="cron" lang={lang} />
        </>
      ) : null}
    </div>
  );
}
