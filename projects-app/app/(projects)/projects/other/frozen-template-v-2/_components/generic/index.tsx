import type { Entity } from "../../_data/automation.schema";
import type { Surface } from "../surface";
import SectionAccordion from "../shared/section-accordion.client";
import BuildWithAi from "../shared/build-with-ai.client";
import { sectionsStrings } from "../shared/sections-i18n";

// РАЗДЕЛ БЕЗ СОБСТВЕННОЙ ПАПКИ — общий вид для каждой вкладки, которую ещё не построили (карта,
// процессы, расписание, кейсы, страницы приложения, память, база, хранилище, календарь, аналитика).
//
// ЗАЧЕМ ОН ЕСТЬ. Раньше такие вкладки не рисовались вовсе: на витрине их пропускали, в кокпите
// аккордеон открывался пустым. Из-за этого у их сущностей не было ни места на странице, ни якоря для
// оглавления, ни раскрывашки «строить вместе с ИИ» — то есть заказать их разработку было НЕГДЕ.
// Пустой раздел — это состояние, а не причина исчезнуть: он показывает свои сущности, честно говорит,
// что содержимого пока нет, и даёт обе ступени заявки.
//
// Когда у вкладки появится собственная папка (`_components/<tab>/`), этот общий вид её просто перестанет
// касаться — маршрутизатор в `_components/index.tsx` выберет папку.
export default function GenericTab({
  surface,
  tab,
  entities,
  lang,
}: {
  surface: Surface;
  tab: string;
  entities: Entity[];
  lang: string;
}) {
  const S = sectionsStrings(lang);
  const many = entities.length > 1;
  const nested = many && surface === "admin";

  return (
    <div data-entity={tab} data-surface={surface} className="divide-y">
      {entities.map((entity, i) => {
        const body = (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{S.notBuiltYet}</p>
            {surface === "admin" ? (
              <BuildWithAi
                target={{ object: "entity", tab, cuid: entity.cuid }}
                name={entity.name}
                pending={"crudUser" in entity.info ? entity.info.crudUser : undefined}
                lang={lang}
              />
            ) : null}
          </div>
        );

        // якорь для оглавления витрины — по нему прокручивает ящик слева
        return (
          <div key={entity.cuid} id={`entity-${entity.cuid}`} className="scroll-mt-20 py-3 first:pt-0 last:pb-0">
            {nested ? (
              <SectionAccordion tab={tab} cuid={entity.cuid} title={entity.name} defaultOpen={i === 0}>
                {body}
              </SectionAccordion>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">{entity.name}</p>
                {body}
              </>
            )}
          </div>
        );
      })}
      {surface === "admin" ? (
        <BuildWithAi target={{ object: "tab", name: tab }} name={tab.replace(/-/g, " ")} lang={lang} />
      ) : null}
    </div>
  );
}
