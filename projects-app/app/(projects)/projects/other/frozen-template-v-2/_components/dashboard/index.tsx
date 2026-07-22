import type { Entity } from "../../_data/automation.schema";
import type { Surface } from "../surface";
import History from "./public/history";
import TableSettings from "./admin/table-settings";
import DashboardPanes from "./public/components/panes.client";
import { pick } from "../shared/localized";

// МАРШРУТИЗАТОР ДАШБОРДА — не переключатель, а композиция: рисует две половины друг под другом.
// Публичная половина сверху — её видят все. Административная под ней — её берёт только админ-слой.
//
// КАРТА ПАПКИ (чтобы модель открывала ровно то, что ей нужно):
//   public/   — сами таблицы, по файлу на таблицу, + public/components/ общие для них части
//               (вид таблицы с поиском, выбором колонок и карточкой записи; переключатель панелей);
//   admin/    — настройка таблиц, + admin/components/ свои части;
//   i18n.ts   — словарь вкладки на десять языков; columns.ts — чтение объявления таблицы из ядра.
//
// СКОЛЬКО ТАБЛИЦ — РЕШАЕТ ЯДРО: по одной на каждую entity вкладки `dashboard` (закон вкладки: две
// сущности одного вида — две entity, а не вторая вкладка). Имя файла = kebab имени entity
// («History» → `public/history.tsx`), реестр статический — тот же закон, что у пульта и у функций узлов.
const TABLES: Record<string, React.ComponentType<{ entity: Entity; lang: string }>> = {
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
  const titles = entities.map((e) => pick((e.data as Record<string, unknown>).title, lang) || e.name);

  const panes = entities.map((entity) => {
    const Table = TABLES[fileOf(entity.name)];
    if (!Table) {
      // ядро объявило таблицу, файла под неё нет — говорим прямо, а не показываем пустоту
      return (
        <p key={entity.cuid} className="py-2 text-sm text-rose-700 dark:text-rose-400">
          {entity.name}
        </p>
      );
    }
    return <Table key={entity.cuid} entity={entity} lang={lang} />;
  });

  return (
    <div data-entity="dashboard" data-surface={surface}>
      <DashboardPanes titles={titles} lang={lang}>
        {panes}
      </DashboardPanes>
      {surface === "admin" ? <TableSettings entities={entities} lang={lang} /> : null}
    </div>
  );
}
