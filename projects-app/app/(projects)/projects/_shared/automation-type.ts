// AUTOMATION TYPES (frozen standard, step 224 §1.5) — an automation is ONE of two kinds, chosen at
// creation and IMMUTABLE afterwards: the whole logic (above all: whether a run forks) grows out of it. To
// change the type you delete the automation and create a new one — there is no "switch type".
//
//  • STREAM   — like telegram-notes: NO forks. Every incoming event runs the SAME scheme end to end.
//  • INSTANCED — a run FORKS Master -> Instance (223.C.4): each run carries its own input parameters, may be
//    DEFERRED in time (a timer or another process starts it), its progress is tracked, and changes can be
//    made inside the fork (e.g. "write about dogs, 2000 words" instead of "cats, 1000").
//
// The type is written into the automation's _meta at creation and shown as a coloured BADGE in the page's
// top bar, LEFT of the status indicator (owner's design).
export type AutomationType = "stream" | "instanced";

export type AutomationTypeSpec = {
  type: AutomationType;
  title: string;
  /** One line the creation modal shows so the owner picks the right one. */
  description: string;
  /** Badge colour classes (turquoise = stream, violet = instanced). */
  badge: string;
};

export const AUTOMATION_TYPES: AutomationTypeSpec[] = [
  {
    type: "stream",
    title: "Stream",
    description:
      "No forks. Every incoming event runs the same scheme from start to finish (like a notes bot reacting to each message).",
    badge: "border-teal-500 text-teal-600 dark:text-teal-400",
  },
  {
    type: "instanced",
    title: "Instanced",
    description:
      "Each run forks into its own instance with its own parameters — it can be deferred (a timer or another process), its progress is tracked, and it can be adjusted inside the fork.",
    badge: "border-violet-500 text-violet-600 dark:text-violet-400",
  },
];

export function automationTypeSpec(type: AutomationType | string | undefined): AutomationTypeSpec {
  return AUTOMATION_TYPES.find((t) => t.type === type) ?? AUTOMATION_TYPES[0];
}
