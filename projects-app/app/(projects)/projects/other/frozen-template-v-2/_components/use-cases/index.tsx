import type { Surface } from "../surface";
import CaseList from "./public/case-list.client";
import UseCasesSettings from "./admin/settings";

// МАРШРУТИЗАТОР КЕЙСОВ — не переключатель, а КОМПОЗИЦИЯ (стандарт папки-вкладки, образец calendar/dashboard):
// публичная половина сверху (видят все), административная под ней (только админ-слой).
//
// КАРТА ПАПКИ:
//   public/  — read-only список кейсов (номер + заголовок + статус + описание), что видит конечный
//              пользователь; работает без `_shared-v2` (закон 0 + shadcn);
//   admin/   — АДМИНИСТРАТИВНАЯ половина, тянет `_shared-v2` через дев-слот (кнопка «Настроить», режимы
//              настройки/подтверждения, Quiz создания кейсов);
//   i18n.ts  — строки секции; status.ts — статусы кейса и их бейджи.
//
// Кейсы живут в ТОП-УРОВНЕВОМ `core.useCases`, а не в `components.tabs` — это секция, а не вкладка; но
// внутренняя тройка public/admin/index у неё та же, что у любой вкладки.
type Case = { cuid: string; number: number; title: string; text: string; status: string };

export default function UseCases({ cases, surface, lang }: { cases: Case[]; surface: Surface; lang: string }) {
  return (
    <div data-entity="use-cases" data-surface={surface} className="space-y-3">
      <CaseList cases={cases} lang={lang} />
      {surface === "admin" ? <UseCasesSettings /> : null}
    </div>
  );
}
