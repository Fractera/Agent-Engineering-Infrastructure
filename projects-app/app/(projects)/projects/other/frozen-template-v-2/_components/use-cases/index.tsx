import CaseList from "./public/case-list.client";

// ВКЛАДКА ПОЛЬЗОВАТЕЛЬСКИХ КЕЙСОВ — РАНТАЙМ-половина (закон устойчивости: продакшн твёрдый). Здесь только
// то, что видит конечный пользователь — read-only список кейсов (номер + заголовок + статус + описание),
// ровно как v1 «view mode». Живёт В ПАПКЕ автоматизации, зависит только от `zod`/shadcn — уезжает ZIP.
//
// Полный инструмент владельца (кнопка «Настроить», режимы settings/review, весь Quiz) — это ДЕВ/АДМИН
// слой, он живёт СНАРУЖИ в `_shared-v2/components/use-cases/` и подтягивается fail-silent дев-слотом. Нет
// `_shared-v2` — остаётся этот read-only список, продакшн не задет.
type Case = { cuid: string; number: number; title: string; text: string; status: string };

export default function UseCases({ cases, lang }: { cases: Case[]; lang: string }) {
  return <CaseList cases={cases} lang={lang} />;
}
