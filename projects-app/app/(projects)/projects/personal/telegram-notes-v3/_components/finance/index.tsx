import type { Entity } from "../../_data/automation.schema";
import MainFinanceClient from "./public/main-finance.client";

// ВКЛАДКА «ФИНАНСЫ» — реестр движений денег (таблица `finance`), отдельная от заметок (паритет v1).
// Продуктовая поверхность: таблица живёт в `public/`. Наполняется потоком (фото чека / слова → digitizeMoney
// → deliverDatabase пишет в таблицу finance), поэтому «добавить строку» руками тут нет — только просмотр и
// удаление (admin). Раньше вкладки не было: траты писались, но их было не видно.
export default function Finance({ entities: _entities, lang }: { entities: Entity[]; lang: string }) {
  return (
    <div data-entity="finance">
      <MainFinanceClient lang={lang} mode="admin" />
    </div>
  );
}
