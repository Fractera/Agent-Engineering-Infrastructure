import type { Passport } from "../../_data/automation.schema";
import StatusBar from "./status-bar";
import Notifications from "../notifications";
import Warnings from "../warnings";

// ШАПКА АВТОМАТИЗАЦИИ — поверхность одна, кокпит (шаг 300: `?view=public`/surface удалены как v1-остаток).
// Всё, что она рисует, выведено из ядра (паспорт + список вкладок), переданного пропсами: страница
// (page.tsx) — единственная точка, читающая платформу, поэтому папка остаётся переносимой (закон 0).
//
// ПОРЯДОК v1 (шаг 243.1): статус-бар → уведомление. Полоса стоит сразу под статус-баром и рисуется
// только когда есть поводы (иначе сама прячется).
// Строка вкладки для шапки: имя, присутствие и сущности с уже разрешёнными на языке страницы подписями.
type TabRow = {
  name: string;
  presence: "absent" | "collapsed" | "expanded";
  entities: { cuid: string; title: string }[];
};

export default function AutomationChrome({
  passport,
  lang,
  tabs,
  envKeys,
}: {
  passport: Passport;
  lang: string;
  tabs: TabRow[];
  /** Объявленные переменные окружения — из них меню выводит карточки настроек. */
  envKeys: string[];
}) {
  return (
    <div data-chrome-root="admin">
      <StatusBar passport={passport} lang={lang} tabs={tabs} envKeys={envKeys} />
      <Notifications lang={lang} />
      {/* ЦЕНТР ПРОБЛЕМ (шаг 298) — бейдж «⚠ N» + модалка с открытыми предупреждениями агента. Своя
          сущность со своим провайдером (единый источник), рядом с полосой-уведомлением. */}
      <Warnings lang={lang} />
    </div>
  );
}
