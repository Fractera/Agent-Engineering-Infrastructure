// fractera:subject default — the STARTER placeholder (ontology entity 13 Subject, §D, step 195).
// A project that declares a `subject` block GETS this file rewritten by the engine (kind + the status
// state machine + transitions). SUBJECT_KIND === "" means this automation has no cross-automation
// subject, so the project page hides the Subjects section. Canon:
// CRUD-DOCS/workspace-standards/automation-ontology.md §D.

export type SubjectTransition = { from: string; to: string };

export const SUBJECT_KIND = "";
export const SUBJECT_STATUSES: string[] = [];
export const SUBJECT_TRANSITIONS: SubjectTransition[] = [];

// A transition is allowed iff it is declared (a closed state machine).
export function canTransition(from: string, to: string): boolean {
  return SUBJECT_TRANSITIONS.some((t) => t.from === from && t.to === to);
}
