// fractera:columns default — the STARTER's placeholder column registry (ontology entity 12
// Record). A DECOMPOSED project REPLACES this file: the engine rewrites it from the graph's
// `record.fields[]` (marker above, same contract as _data/actions.ts — a re-run overwrites it).
// The universal RecordsTable renders whatever this declares through a CLOSED set of typed
// renderers; adding a column = extend the GRAPH and re-run, never edit a component.
// Canon: CRUD-DOCS/workspace-standards/automation-ontology.md.

export type ColumnType = "badge" | "text" | "longtext" | "date" | "link" | "actions";

export type ColumnOptions = {
  colorFrom?: string; // badge: the row-value key whose Action color tints the badge
  emphasizeIfFuture?: boolean; // date: emphasized while the timestamp is still in the future
  expand?: boolean; // longtext: click to expand the cell
  action?: "detail" | "delete"; // actions: which row action this column renders
};

export type ProjectColumn = {
  id: string; // value key in the record row
  header: string; // column header label
  type: ColumnType; // picks the renderer
  source: string; // the RECORD_TABLE column feeding this cell
  defaultVisible: boolean; // shown before the user toggles the picker
  attr?: string; // ontology entity id — the picker labels the checkbox from ONTOLOGY_ATTRS
  options?: ColumnOptions;
};

// The DB table rows come from. Empty string = the generic completed-runs results
// (project_cron_runs) — the starter default before an automation declares its own table.
export const RECORD_TABLE = "";

export const PROJECT_COLUMNS: ProjectColumn[] = [
  { id: "title", header: "Result", type: "text", source: "title", defaultVisible: true },
  { id: "artifact", header: "Artifact", type: "link", source: "artifactUrl", defaultVisible: true },
  { id: "produced", header: "Produced", type: "date", source: "producedAt", defaultVisible: true },
];

// The ids shown before the user toggles the picker.
export function defaultVisibleColumnIds(): string[] {
  return PROJECT_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id);
}

export function projectColumn(id: string): ProjectColumn | undefined {
  return PROJECT_COLUMNS.find((c) => c.id === id);
}
