import { createAutomationStrings } from "./create-automation-i18n";

// AUTOMATION TYPES (frozen standard, step 224 §1.5; extended step 234) — an automation is ONE of three
// kinds, chosen at creation and IMMUTABLE afterwards: the whole logic (above all: whether a run forks) grows
// out of it. To change the type you delete the automation and create a new one — there is no "switch type".
//
//  • STREAM   — like telegram-notes: NO forks. Every incoming event runs the SAME scheme end to end.
//  • INSTANCED — a run FORKS Master -> Instance (223.C.4): each run carries its own input parameters, may be
//    DEFERRED in time (a timer or another process starts it), its progress is tracked, and changes can be
//    made inside the fork (e.g. "write about dogs, 2000 words" instead of "cats, 1000").
//  • CHAINED — a DIFFERENT axis: this automation is a link in a chain of SEPARATE automations, connected by
//    an event (step 195's Subject + Trigger `event` + Action `emits` — already live, e.g.
//    child-course-builder -> child-knowledge-check). It answers "is this automation wired to another one?",
//    not "does this run fork?" — orthogonal to Stream/Instanced in principle.
//
// CHAINED IS REAL (step 234.3): picking "chained" in the creation modal now stores AUTOMATION_TYPE =
// "chained" for real (the step-234 temporary "materializes as instanced" coercion was removed once the
// group/subflow canvas behavior below existed to give it somewhere to land — see app/api/projects/create/
// route.ts). The frozen skeleton is still the same file set as stream/instanced (draft input/logic/output
// nodes) — only the stored type token and the global canvas rendering differ now: a chained automation
// renders as a GROUP container node on the global canvas (_shared/components/global-canvas.client.tsx) that
// other automations can be dragged into (React Flow's parentId/extent:'parent' sub-flow pattern).
//
// The type is written into the automation's _meta at creation and shown as a coloured BADGE in the page's
// top bar, LEFT of the status indicator (owner's design).
export type AutomationType = "stream" | "instanced" | "chained";

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
  {
    type: "chained",
    title: "Chained",
    description:
      "Triggered by another automation's event, or emits one for the next — a link in a chain, not a standalone run (e.g. outreach finishes → a dialog script starts).",
    badge: "border-sky-500 text-sky-600 dark:text-sky-400",
  },
];

// TEN-LANGUAGE title/description (CLAUDE.md 4г) — reuses create-automation-i18n.ts's own typeXTitle/typeXDesc
// keys (the creation modal's TYPE_TEXT) rather than a second dictionary: same three types, same copy, one
// source of truth. `lang` is optional so existing English-only callers stay source-compatible.
export function automationTypeSpec(type: AutomationType | string | undefined, lang?: string): AutomationTypeSpec {
  const spec = AUTOMATION_TYPES.find((t) => t.type === type) ?? AUTOMATION_TYPES[0];
  if (!lang) return spec;
  const L = createAutomationStrings(lang);
  const byType: Record<AutomationType, { title: string; description: string }> = {
    stream: { title: L.typeStreamTitle, description: L.typeStreamDesc },
    instanced: { title: L.typeInstancedTitle, description: L.typeInstancedDesc },
    chained: { title: L.typeChainedTitle, description: L.typeChainedDesc },
  };
  const t = byType[spec.type];
  return { ...spec, title: t.title, description: t.description };
}
