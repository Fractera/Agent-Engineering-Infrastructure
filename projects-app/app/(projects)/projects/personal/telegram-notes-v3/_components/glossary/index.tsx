import type { Entity } from "../../_data/automation.schema";
import MainGlossaryClient from "./public/main-glossary.client";

// ВКЛАДКА «ГЛОССАРИЙ» (309, требование владельца) — пользовательские алиасы/сокращения (таблица `glossary`).
// Владелец говорит боту «запомни, что чеки SODO ADEJE — это Mercadona» → строка попадает сюда автоматически;
// здесь же её можно добавить руками и удалить. Словарь инжектится системной преамбулой во все модельные узлы,
// поэтому «сколько потратил в Меркадоне» находит чеки store=SODO ADEJE. Показывает ручные и авто-строки.
export default function Glossary({ entities: _entities, lang }: { entities: Entity[]; lang: string }) {
  return (
    <div data-entity="glossary">
      <MainGlossaryClient lang={lang} />
    </div>
  );
}
