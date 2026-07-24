// ТИПЫ микросервиса «пользовательские кейсы» — ДЕВ-СЛОЙ (`_shared-v2`). Осознанная копия v1
// `_shared/use-cases.ts` (правило переноса: v1→v2 дословно): статусы кейса, их цветные бейджи и форма
// одного кейса в панели. Микросервис самодостаточен и не тянет типы из v1 `_shared`.
//
// FROZEN STANDARD — an automation's USER CASES (step 222). Use cases are the MANDATORY accordion (outside
// the config entities): the result of the dialogue with the architect at the earliest stage. Each case
// carries a big number (01, 02, …) so the owner can refer to it, and a STATUS badge that moves as it is
// built.
export type UseCaseStatus =
  | "new"
  | "in-approval"
  | "approved"
  | "in-development"
  | "testing"
  | "in-use";

export type UseCaseStatusMeta = { label: string; className: string };

// Colored badges, English labels. Order = lifecycle order.
export const STATUS_ORDER: UseCaseStatus[] = [
  "new",
  "in-approval",
  "approved",
  "in-development",
  "testing",
  "in-use",
];

export const STATUS_META: Record<UseCaseStatus, UseCaseStatusMeta> = {
  "new": { label: "new", className: "bg-slate-500/15 text-slate-600 dark:text-slate-300 ring-1 ring-slate-500/25" },
  "in-approval": { label: "in approval", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/25" },
  "approved": { label: "approved", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/25" },
  "in-development": { label: "in development", className: "bg-violet-500/15 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/25" },
  "testing": { label: "testing", className: "bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/25" },
  "in-use": { label: "in use", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/25" },
};

// Форма кейса в ПАНЕЛИ (дев-слой). `summary` тут — это `text` кейса в ядре v2: панель их отображает под
// заголовком, а серверная модель зовёт то же поле `text`. Маппинг делает панель при чтении `api/core`.
export type UseCase = {
  id: string;
  title: string;
  summary?: string;
  status: UseCaseStatus;
};
