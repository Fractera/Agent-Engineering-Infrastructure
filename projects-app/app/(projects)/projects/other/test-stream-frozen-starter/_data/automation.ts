import type { AutomationType } from "../_types/automation-type";

// This automation's TYPE (frozen standard, step 224, extended 234.3). Chosen once at creation; the whole
// logic grows out of it (above all: whether a run forks). There is no casual owner "switch type" button —
// but the develop agent MAY force-correct a genuine mismatch (step 253, variant «а»): if your founding
// instruction plainly describes a different type than the one set, development rewrites this token in place
// and rebuilds. Shown as the coloured badge in the top bar.
//   stream    — no forks; every incoming event runs the same scheme end to end.
//   instanced — each run forks Master -> Instance with its own parameters; may be deferred and tracked.
//   chained   — a link in a chain of separate automations; renders as a group container on the global canvas.
export const AUTOMATION_TYPE: AutomationType = "stream";
