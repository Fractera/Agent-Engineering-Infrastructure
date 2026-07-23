import type { Entity } from "../../../_data/automation.schema";
import { tableOf, typesOf } from "../entries";
import { calendarStrings } from "../i18n";
import { pick } from "../../shared/localized";
import { InfoIcon } from "../../chrome/icons";
import EntryTypesTable from "./components/entry-types-table";

// НАСТРОЙКА КАЛЕНДАРЕЙ — административная половина вкладки: то, что дописывается ПОД публичными
// календарями и видно только владельцу. Посетителю не отдаётся никогда (тот же закон, что у пульта и
// дашборда: использование отдельно, управление отдельно).
//
// ЧТО ЗДЕСЬ ИЗ v1. Там объяснение «что это за раздел» стояло ОТДЕЛЬНОЙ ПЛАШКОЙ НАД календарём и было
// admin-хромом (посетителю оно не показывалось никогда). В v2 административная половина живёт ПОД
// публичной — общая раскладка кокпита, одинаковая у всех вкладок, — поэтому плашка переехала сюда.
// Сам календарь при этом выглядит ровно как в первой версии: над ним больше ничего не висит.
//
// Раскрывашка на <details>, работает без JavaScript. Для каждого календаря: его хранилище и объявленные
// виды записей.
export default function CalendarSettings({ entities, lang }: { entities: Entity[]; lang: string }) {
  const L = calendarStrings(lang);

  return (
    <section data-calendar="admin" className="border-t pt-3">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center py-2 text-sm font-medium hover:underline">
          {L.settings}
        </summary>
        <div className="space-y-4 pb-2 pt-1">
          <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground" data-calendar-admin="instruction">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">{L.instructionTitle}</p>
              <p>{L.instructionBody}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{L.settingsHint}</p>
          {entities.map((entity) => (
            <div key={entity.cuid} className="space-y-2">
              <p className="text-sm font-medium">
                {pick((entity.data as Record<string, unknown>).title, lang) || entity.name}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {L.table}: <span className="font-mono">{tableOf(entity)}</span>
                </span>
              </p>
              <EntryTypesTable types={typesOf(entity)} lang={lang} />
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
