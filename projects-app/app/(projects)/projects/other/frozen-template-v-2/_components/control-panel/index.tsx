import type { Entity } from "../../_data/automation.schema";
import type { Surface } from "../surface";
import FirstControlPanel from "./public/first-control-panel";
import RequestSettings from "./admin/request-settings";
import SectionAccordion from "../shared/section-accordion.client";
import { DevSlot } from "../shared/dev-slot";
import { DevBuildWithAi } from "../shared/dev-slot.client";
import { controlPanelStrings, pick } from "./i18n";
import { dataText } from "./params";

// МАРШРУТИЗАТОР ПУЛЬТА ЗАПУСКА — не переключатель, а композиция: рисует две половины друг под другом.
// Публичная половина сверху — её видят все. Административная под ней — её берёт только админ-слой.
//
// КАРТА ПАПКИ (чтобы модель открывала ровно то, что ей нужно, и не читала лишнего):
//   public/   — сами пульты, по файлу на пульт, + public/components/ общие для них части;
//   admin/    — настройка запроса, + admin/components/ свои части;
//   i18n.ts   — словарь вкладки на десять языков; params.ts — чтение объявления формы из ядра.
//
// СКОЛЬКО ПУЛЬТОВ — РЕШАЕТ ЯДРО: по одному на каждую entity вкладки `control-panel` в automation.json
// (закон вкладки: две сущности одного вида — две entity, а не вторая вкладка).
//
// Имя файла = kebab имени entity («First control panel» → `public/first-control-panel.tsx`) — тот же
// закон, что у функций узлов: имя есть АДРЕС файла. Реестр статический (шаблонный import по имени в
// route-group `(projects)` не резолвится в рантайме — урок v1); ядро объявило пульт без файла — говорим
// об этом честно, а не молчим.
//
// ДВА ПУЛЬТА — ДВА ВЛОЖЕННЫХ АККОРДЕОНА (правило владельца 2026-07-22): начиная со второго каждый пульт
// получает свой аккордеон внутри главного; первый раскрыт, остальные свёрнуты, состояние каждого
// запоминается в браузере. НА ВИТРИНЕ аккордеонов нет: там все пульты раскрыты всегда.
const PANELS: Record<string, React.ComponentType<{ entity: Entity; lang: string; surface: Surface; heading?: boolean }>> = {
  "first-control-panel": FirstControlPanel,
};

const fileOf = (name: string) => name.trim().toLowerCase().replace(/\s+/g, "-");

export default function ControlPanel({
  surface,
  entities,
  lang,
}: {
  surface: Surface;
  entities: Entity[];
  lang: string;
}) {
  const L = controlPanelStrings(lang);
  const many = entities.length > 1;
  const tabTitle = "control panel";
  const landing = surface === "public";

  return (
    <div data-entity="control-panel" data-surface={surface} className="divide-y">
      {entities.map((entity, i) => {
        const Panel = PANELS[fileOf(entity.name)];
        const title = pick(dataText(entity, "title"), lang) || entity.name;
        const nested = many && !landing; // имя стоит в шапке вложенного аккордеона
        const pending = "crudUser" in entity.info ? entity.info.crudUser : undefined;
        // ЗАЯВКА НА ОДИН ПУЛЬТ — свой адрес в ядре (entity), поэтому и раскрывашка своя, названная
        // именем этого пульта. В кокпите она идёт сразу под ним; посетителю не показывается.
        const body = Panel ? (
          <div className="space-y-3">
            <Panel entity={entity} lang={lang} surface={surface} heading={!nested} />
            {surface === "admin" ? (
              <DevSlot>
                <DevBuildWithAi target={{ object: "entity", tab: "control-panel", cuid: entity.cuid }} name={title} pending={pending} lang={lang} />
              </DevSlot>
            ) : null}
          </div>
        ) : (
          <p className="py-2 text-sm text-rose-700 dark:text-rose-400">
            {L.noComponent.replace("{k}", entity.name)}
          </p>
        );

        // якорь для навигации публичной страницы — по нему прокручивает ящик слева
        return (
          <div key={entity.cuid} id={`entity-${entity.cuid}`} className="scroll-mt-20 py-3 first:pt-0 last:pb-0">
            {nested ? (
              <SectionAccordion tab="control-panel" cuid={entity.cuid} title={title} defaultOpen={i === 0}>
                {body}
              </SectionAccordion>
            ) : (
              body
            )}
          </div>
        );
      })}
      {surface === "admin" ? (
        <DevSlot>
          <RequestSettings entities={entities} lang={lang} />
          {/* ЗАЯВКА НА ВСЮ ВКЛАДКУ — другой объект ядра (tab), поэтому отдельная раскрывашка внизу. */}
          <DevBuildWithAi target={{ object: "tab", name: "control-panel" }} name={tabTitle} lang={lang} />
        </DevSlot>
      ) : null}
    </div>
  );
}
