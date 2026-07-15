import type { AutomationType } from "../../../_shared/automation-type";

// This automation's IMMUTABLE TYPE (frozen standard, step 224 — see frozen-project-starter.ts SKELETON).
// STREAM: no forks — every incoming ask runs the same scheme end to end. Declared explicitly (rather than
// left to the DB-derived fallback in automation-type-reader.ts) so the type is unambiguous from day one.
export const AUTOMATION_TYPE: AutomationType = "stream";
