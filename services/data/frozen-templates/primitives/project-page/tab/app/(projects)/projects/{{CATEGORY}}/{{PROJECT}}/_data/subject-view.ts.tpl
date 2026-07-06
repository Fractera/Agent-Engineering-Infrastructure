import type { ProjectColumn } from "./columns";

// Column sets for the Subjects table and the activity log (ontology entity 13, §D, step 195).
// These reuse the SAME universal RecordsTable + typed renderers (step 194). Unlike a Record's
// columns (config-driven per automation), the subjects/subject_events schemas are FIXED substrate,
// so their columns are fixed here. `status` renders as a badge; timestamps as dates.

export const SUBJECT_COLUMNS: ProjectColumn[] = [
  { id: "kind", header: "Kind", type: "text", source: "kind", defaultVisible: true, attr: "subject" },
  { id: "status", header: "Status", type: "badge", source: "status", defaultVisible: true },
  { id: "owner", header: "Owned by", type: "text", source: "owner_automation", defaultVisible: true },
  { id: "updated", header: "Updated", type: "date", source: "updated_at", defaultVisible: true },
  { id: "id", header: "Subject id", type: "text", source: "id", defaultVisible: false },
];

export const ACTIVITY_COLUMNS: ProjectColumn[] = [
  { id: "event", header: "Event", type: "text", source: "event", defaultVisible: true, attr: "event" },
  { id: "subject", header: "Subject", type: "text", source: "subject_id", defaultVisible: true, attr: "subject" },
  { id: "from", header: "From automation", type: "text", source: "from_automation", defaultVisible: true },
  { id: "at", header: "At", type: "date", source: "created_at", defaultVisible: true },
];
