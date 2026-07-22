import type { Entity } from "../../../_data/automation.schema";
import { controlPanelStrings, pick } from "../i18n";
import { paramsOf, dataText } from "../params";
import ParamsTable from "./components/params-table";
import SendToDevelopment from "../../shared/send-to-development.client";
import { sendStrings } from "../../shared/send-to-development-i18n";

// НАСТРОЙКА ЗАПРОСА — административная половина вкладки: то, что дописывается ПОД публичной половиной
// и видно только владельцу. Посетителю не отдаётся никогда (образец v1: использование отдельно,
// управление отдельно).
//
// Раскрывашка на <details> — работает без JavaScript (канон статики). Показывает поля КАЖДОГО пульта
// вкладки так, как они объявлены в ядре: источник истины один, здесь его видно глазами.
export default function RequestSettings({ entities, lang }: { entities: Entity[]; lang: string }) {
  const L = controlPanelStrings(lang);
  const S = sendStrings(lang);

  return (
    <section data-control-panel="admin" className="border-t pt-3">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-sm font-medium hover:underline">
          {L.settings}
          <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="space-y-4 pb-2 pt-1">
          <p className="text-xs text-muted-foreground">{L.settingsHint}</p>
          {entities.map((entity) => (
            <div key={entity.cuid} className="space-y-2">
              <p className="text-sm font-medium">{pick(dataText(entity, "title"), lang) || entity.name}</p>
              <ParamsTable params={paramsOf(entity)} lang={lang} />
              {/* Задание владельца, уже записанное в ядро и ещё не разобранное моделью — показываем его,
                  чтобы отправка в разработку не выглядела как «ушло в никуда». */}
              {"crudUser" in entity.info ? (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{S.devPending}</span> {entity.info.crudUser}
                </p>
              ) : null}
              <SendToDevelopment tab="control-panel" cuid={entity.cuid} lang={lang} />
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
