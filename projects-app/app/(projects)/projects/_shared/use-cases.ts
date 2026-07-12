// FROZEN STANDARD — an automation's USER CASES (step 222).
//
// Use cases are the MANDATORY accordion (outside the 6 config entities). They are the result of the
// dialogue with the architect at the earliest stage: the request is broken into individual cases that
// are segmented and agreed one by one. Each case carries a big number (01, 02, …) so the owner can
// refer to it ("in case 02, change …") and a STATUS badge that moves as the case is built. A fresh
// skeleton is seeded with ONE case ("Architect planned the automation", status: new) — this makes the
// step impossible to skip and shows the agent the shape to reuse.
//
// The development cycle (see app/(projects)/README.md): an automation is NOT built in one shot — the
// initial request is split into raw cases (even if the user never wrote them as cases), and short
// iterations move each case's status forward until they are all "in use".
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

export type UseCase = {
  id: string;
  title: string;
  summary?: string;
  status: UseCaseStatus;
};
