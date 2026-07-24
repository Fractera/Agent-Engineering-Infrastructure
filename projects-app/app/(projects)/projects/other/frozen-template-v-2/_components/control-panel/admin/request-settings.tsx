import type { Entity } from "../../../_data/automation.schema";
import { controlPanelStrings, pick } from "../i18n";
import { paramsOf, dataText } from "../params";
import ParamsTable from "./components/params-table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// НАСТРОЙКА ЗАПРОСА — административная половина вкладки: то, что дописывается ПОД публичной половиной
// и видно только владельцу. Посетителю не отдаётся никогда (образец v1: использование отдельно,
// управление отдельно).
//
// Раскрывашка на shadcn-`Accordion` (обязательность shadcn во v2, решение A). Компонент остаётся
// серверным: аккордеон — клиентский островок, а его содержимое (таблицы полей) рендерится на сервере и
// передаётся детьми. Живёт в кокпите владельца (admin-поверхность), а он свободен от канона no-JS.
// Показывает поля КАЖДОГО пульта вкладки так, как они объявлены в ядре: источник истины один, здесь его
// видно глазами.
export default function RequestSettings({ entities, lang }: { entities: Entity[]; lang: string }) {
  const L = controlPanelStrings(lang);

  return (
    <section data-control-panel="admin" className="border-t pt-3">
      <Accordion type="single" collapsible>
        <AccordionItem value="request-settings">
          <AccordionTrigger className="py-2">{L.settings}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-1">
              <p className="text-xs text-muted-foreground">{L.settingsHint}</p>
              {entities.map((entity) => (
                <div key={entity.cuid} className="space-y-2">
                  <p className="text-sm font-medium">{pick(dataText(entity, "title"), lang) || entity.name}</p>
                  <ParamsTable params={paramsOf(entity)} lang={lang} />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
