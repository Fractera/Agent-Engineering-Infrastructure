// Data contracts of the project page tables.
export type ProcessRun = {
  id: string;
  process: string;
  status: "in-progress" | "completed" | "failed";
  startedAt: string; // ISO date-time
  finishedAt: string | null;
};

export type ProjectResult = {
  id: string;
  title: string;
  artifactUrl: string; // link to the produced artifact (e.g. a published page)
  producedAt: string; // ISO date-time
};

// One row of the universal records table (ontology entity 12 Record). Columns are
// config-driven (_data/columns.ts, generated from the graph); a row carries an id plus
// a values map keyed by column id — the RecordsTable renders values[col.id] through the
// typed renderer for col.type. No automation hand-codes a bespoke table.
export type RecordRow = {
  id: string;
  values: Record<string, unknown>;
};

export type CronJob = {
  id: string;
  title: string;
  schedule: string; // 5-field cron expression, server local time
  enabled: boolean;
};

// A registered automation hook (step 187): a spoken trigger phrase → an action,
// stored in the GLOBAL project_hooks table (app-wide unique phrases).
export type Hook = {
  id: string;
  phrase: string;
  action: "save" | "remind" | "recall" | "custom";
  lang: string;
  description: string;
};
