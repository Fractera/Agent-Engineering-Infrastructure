import type { Entity } from "../../_data/automation.schema";
import type { Surface } from "../surface";
import FirstControlPanel from "./first-control-panel";
import ControlPanelAdmin from "./admin";
import { controlPanelStrings } from "./i18n";

// МАРШРУТИЗАТОР ПУЛЬТА ЗАПУСКА — не переключатель, а композиция: рисует две половины друг под другом.
// Публичная половина сверху — её видят все. Административная под ней — её берёт только админ-слой.
//
// СКОЛЬКО ПУЛЬТОВ — РЕШАЕТ ЯДРО. Публичная половина — это НЕ один компонент, а по одному на каждую
// entity вкладки `control-panel` в automation.json (закон вкладки: «две сущности одного вида — две
// entity, а не вторая вкладка»; так же живут таблицы дашборда и календари). По умолчанию пульт один.
//
// Имя файла = kebab имени entity («First control panel» → `first-control-panel.tsx`) — тот же закон, что
// у функций узлов: имя есть АДРЕС файла. Реестр статический (шаблонный import по имени в route-group
// `(projects)` не резолвится в рантайме — урок v1); ядро объявило пульт без файла — честно говорим об этом,
// а не молчим.
const PANELS: Record<string, React.ComponentType<{ entity: Entity; lang: string }>> = {
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

  return (
    <div data-entity="control-panel" data-surface={surface}>
      {entities.map((entity) => {
        const Panel = PANELS[fileOf(entity.name)];
        if (!Panel) {
          return (
            <p key={entity.cuid} className="py-2 text-sm text-rose-700 dark:text-rose-400">
              {L.noComponent.replace("{k}", entity.name)}
            </p>
          );
        }
        return <Panel key={entity.cuid} entity={entity} lang={lang} />;
      })}
      {surface === "admin" ? <ControlPanelAdmin entities={entities} lang={lang} /> : null}
    </div>
  );
}
