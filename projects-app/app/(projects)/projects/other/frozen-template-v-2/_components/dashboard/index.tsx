import type { Entity } from "../../_data/automation.schema";
import type { Surface } from "../surface";
import DashboardTables from "./admin/tables";
import DashboardPublic from "./public/tables";
import { DevSlot } from "../shared/dev-slot";
import { DevBuildWithAi } from "../shared/dev-slot.client";
import { pick } from "../shared/localized";

// МАРШРУТИЗАТОР ДАШБОРДА — та же тройка index/public/admin, что у всех сущностей v2.
//
// 🔒 ЧТО ИЗМЕНИЛОСЬ В ШАГЕ 298 («max copy» по требованию владельца): универсальная таблица первой версии
// перенесена целиком и живёт ОДНОЙ копией в `_shared-v2/components/dashboard` — вместе со своим админ-хромом
// и мостом между ними, как это было в v1 (вид + admin + контейнер рядом). Копия в каждой папке означала бы
// N расходящихся таблиц; таблица универсальна и рисует ЛЮБОЕ объявление, так что её место — в платформе.
//
// В папке остаются: `public/` — витринная половина (та же таблица в режиме только-чтение), `admin/` —
// половина владельца (таблица с правкой строк + настройка объявленных колонок). Обе — через дев-слот.
//
// ЗАЯВКА «строить вместе с ИИ» остаётся здесь: она про ЭТУ автоматизацию, а не про таблицу как инструмент.
export default function Dashboard({
  surface,
  entities,
  lang,
}: {
  surface: Surface;
  entities: Entity[];
  lang: string;
}) {
  return (
    <div data-entity="dashboard" data-surface={surface} className="space-y-3">
      {surface === "admin" ? <DashboardTables lang={lang} /> : <DashboardPublic lang={lang} />}
      {surface === "admin" ? (
        <DevSlot>
          {entities.map((entity) => {
            const title = pick((entity.data as Record<string, unknown>).title, lang) || entity.name;
            const pending = "crudUser" in entity.info ? entity.info.crudUser : undefined;
            return (
              <DevBuildWithAi
                key={entity.cuid}
                target={{ object: "entity", tab: "dashboard", cuid: entity.cuid }}
                name={title}
                pending={pending}
                lang={lang}
              />
            );
          })}
          {/* ЗАЯВКА НА ВСЮ ВКЛАДКУ — другой объект ядра (tab), поэтому отдельная раскрывашка. */}
          <DevBuildWithAi target={{ object: "tab", name: "dashboard" }} name="dashboard" lang={lang} />
        </DevSlot>
      ) : null}
    </div>
  );
}
