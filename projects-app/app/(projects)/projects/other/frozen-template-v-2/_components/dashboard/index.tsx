import type { Entity } from "../../_data/automation.schema";
import type { Surface } from "../surface";
import History from "./public/history";
import SecondTable from "./public/second-table";
import TableSettings from "./admin/table-settings";
import SectionAccordion from "../shared/section-accordion.client";
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
const TABLES: Record<string, React.ComponentType<{ entity: Entity; lang: string }>> = {
  history: History,
  "second-table": SecondTable,
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
    <div data-entity="dashboard" data-surface={surface} className="space-y-4">
      {entities.map((entity, i) => {
        const Table = TABLES[fileOf(entity.name)];
        const title = pick((entity.data as Record<string, unknown>).title, lang) || entity.name;
        const body = Table ? (
          <Table entity={entity} lang={lang} />
        ) : (
          // ядро объявило таблицу, файла под неё нет — говорим прямо, а не показываем пустоту
          <p className="py-2 text-sm text-rose-700 dark:text-rose-400">{entity.name}</p>
        );

        // якорь для навигации публичной страницы — по нему прокручивает ящик слева
        return (
          <div key={entity.cuid} id={`entity-${entity.cuid}`} className="scroll-mt-20">
            {many && !landing ? (
              <SectionAccordion tab="dashboard" cuid={entity.cuid} title={title} defaultOpen={i === 0}>
                {body}
              </SectionAccordion>
            ) : (
              body
            )}
          </div>
        );
      })}
      {surface === "admin" ? <TableSettings entities={entities} lang={lang} /> : null}
    </div>
  );
}
