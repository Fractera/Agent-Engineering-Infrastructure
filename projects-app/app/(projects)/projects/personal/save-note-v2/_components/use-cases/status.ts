// Статусы кейса и их цветные бейджи — РАНТАЙМ-копия (закон 0: папка автоматизации самодостаточна, не тянет
// типы дев-слоя `_shared-v2`). Значения дословно те же, что в `_shared-v2/.../types/use-cases.ts`.
export type UseCaseStatus =
  | "new"
  | "in-approval"
  | "approved"
  | "in-development"
  | "testing"
  | "in-use";

export const STATUS_META: Record<UseCaseStatus, { label: string; className: string }> = {
  "new": { label: "new", className: "bg-slate-500/15 text-slate-600 dark:text-slate-300 ring-1 ring-slate-500/25" },
  "in-approval": { label: "in approval", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/25" },
  "approved": { label: "approved", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/25" },
  "in-development": { label: "in development", className: "bg-violet-500/15 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/25" },
  "testing": { label: "testing", className: "bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/25" },
  "in-use": { label: "in use", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/25" },
};
