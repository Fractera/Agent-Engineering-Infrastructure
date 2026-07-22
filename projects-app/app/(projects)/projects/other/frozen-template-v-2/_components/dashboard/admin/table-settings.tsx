import type { Entity } from "../../../_data/automation.schema";
import { columnsOf, tableOf } from "../columns";
import { dashboardStrings } from "../i18n";
import { pick } from "../../shared/localized";
import ColumnsTable from "./components/columns-table";
import SendToDevelopment from "../../shared/send-to-development.client";
import { sendStrings } from "../../shared/send-to-development-i18n";

// НАСТРОЙКА ТАБЛИЦ — административная половина вкладки: то, что дописывается ПОД публичными таблицами и
// видно только владельцу. Посетителю не отдаётся никогда (тот же закон, что у пульта: использование
// отдельно, управление отдельно).
//
// Раскрывашка на <details>, работает без JavaScript. Для каждой таблицы: её хранилище, объявленные
// колонки и отправка задания в разработку — тем же общим компонентом, что и у пульта.
export default function TableSettings({ entities, lang }: { entities: Entity[]; lang: string }) {
  const L = dashboardStrings(lang);
  const S = sendStrings(lang);

  return (
    <section data-dashboard="admin" className="border-t pt-3">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-sm font-medium hover:underline">
          {L.settings}
          <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="space-y-4 pb-2 pt-1">
          <p className="text-xs text-muted-foreground">{L.settingsHint}</p>
          {entities.map((entity) => (
            <div key={entity.cuid} className="space-y-2">
              <p className="text-sm font-medium">
                {pick((entity.data as Record<string, unknown>).title, lang) || entity.name}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {L.table}: <span className="font-mono">{tableOf(entity)}</span>
                </span>
              </p>
              <ColumnsTable columns={columnsOf(entity)} lang={lang} />
              {/* Задание владельца, уже записанное в ядро и ещё не разобранное моделью. */}
              {"crudUser" in entity.info ? (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{S.devPending}</span> {entity.info.crudUser}
                </p>
              ) : null}
              <SendToDevelopment tab="dashboard" cuid={entity.cuid} lang={lang} />
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
