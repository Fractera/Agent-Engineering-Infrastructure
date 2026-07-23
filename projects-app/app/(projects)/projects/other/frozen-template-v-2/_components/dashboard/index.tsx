import type { Entity } from "../../_data/automation.schema";
import type { Surface } from "../surface";
import History from "./public/history";
import TableSettings from "./admin/table-settings";
import SectionAccordion from "../shared/section-accordion.client";
import BuildWithAi from "../shared/build-with-ai.client";
import { pick } from "../shared/localized";

// МАРШРУТИЗАТОР ДАШБОРДА — не переключатель, а композиция: рисует две половины друг под другом.
// Публичная половина сверху — её видят все. Административная под ней — её берёт только админ-слой.
//
// КАРТА ПАПКИ (чтобы модель открывала ровно то, что ей нужно):
//   public/   — сами таблицы, по файлу на таблицу, + public/components/ общие для них части
//               (вид таблицы с поиском, выбором колонок и карточкой записи; ленивая загрузка строк);
//   admin/    — настройка таблиц, + admin/components/ свои части;
//   i18n.ts   — словарь вкладки на десять языков; columns.ts — чтение объявления таблицы из ядра.
//
// СКОЛЬКО ТАБЛИЦ — РЕШАЕТ ЯДРО: по одной на каждую entity вкладки `dashboard`. Имя файла = kebab имени
// entity («History» → `public/history.tsx`), реестр статический — тот же закон, что у пульта и у функций
// узлов.
//
// ДВЕ ТАБЛИЦЫ — ДВА ВЛОЖЕННЫХ АККОРДЕОНА (правило владельца 2026-07-22): одна таблица показывается как
// есть, а начиная со второй каждая получает свой аккордеон внутри главного; первая раскрыта, остальные
// свёрнуты, и состояние каждой запоминается в браузере. НА ВИТРИНЕ аккордеонов нет вовсе: там всё
// раскрыто всегда, как диаграмма.
const TABLES: Record<string, React.ComponentType<{ entity: Entity; lang: string; heading?: boolean }>> = {
  history: History,
};

const fileOf = (name: string) => name.trim().toLowerCase().replace(/\s+/g, "-");

export default function Dashboard({
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
    <div data-entity="dashboard" data-surface={surface} className="divide-y">
      {entities.map((entity, i) => {
        const Table = TABLES[fileOf(entity.name)];
        const title = pick((entity.data as Record<string, unknown>).title, lang) || entity.name;
        const nested = many && !landing; // имя стоит в шапке вложенного аккордеона
        const pending = "crudUser" in entity.info ? entity.info.crudUser : undefined;
        // ЗАЯВКА НА ОДНУ ТАБЛИЦУ — свой адрес в ядре (entity) и своё имя в заголовке раскрывашки.
        const body = Table ? (
          <div className="space-y-3">
            <Table entity={entity} lang={lang} heading={!nested} />
            {surface === "admin" ? (
              <BuildWithAi target={{ object: "entity", tab: "dashboard", cuid: entity.cuid }} name={title} pending={pending} lang={lang} />
            ) : null}
          </div>
        ) : (
          // ядро объявило таблицу, файла под неё нет — говорим прямо, а не показываем пустоту
          <p className="py-2 text-sm text-rose-700 dark:text-rose-400">{entity.name}</p>
        );

        // якорь для навигации публичной страницы — по нему прокручивает ящик слева
        return (
          <div key={entity.cuid} id={`entity-${entity.cuid}`} className="scroll-mt-20 py-3 first:pt-0 last:pb-0">
            {nested ? (
              <SectionAccordion tab="dashboard" cuid={entity.cuid} title={title} defaultOpen={i === 0}>
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
          <TableSettings entities={entities} lang={lang} />
          {/* ЗАЯВКА НА ВЕСЬ ДАШБОРД — объект tab, отдельно от заявок на отдельные таблицы. */}
          <BuildWithAi target={{ object: "tab", name: "dashboard" }} name="dashboard" lang={lang} />
        </>
      ) : null}
    </div>
  );
}
