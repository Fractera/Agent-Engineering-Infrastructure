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

// One row of the unified results table (step 188 Phase 3), read from the
// telegram_notes table. `reminderDue`/`createdAt` are unix seconds; `reminderDue`
// is set only for reminders. `full_text` is fetched lazily by the "Full text" modal.
// One row of the UNIVERSAL records table (ontology entity 12 Record) — config-driven columns
// (_data/columns.ts). A row is an id + a values map keyed by column id; the RecordsTable renders
// values[col.id] through the typed renderer for col.type. (NoteRow below is the legacy bespoke shape.)
export type RecordRow = {
  id: string;
  values: Record<string, unknown>;
};

import type { NoteType } from "./note-type";
export type NoteRow = {
  id: string;
  type: NoteType;
  action: string; // the Action id (save|remind|recall) — the ontology entity (188-R)
  hookPhrase: string; // the exact hook phrase that fired (empty if none)
  condition: string | null; // the declared-guard outcome (e.g. date-parsed / needs-date)
  summary: string;
  reminderDue: number | null;
  delivered: boolean;
  createdAt: number;
};
