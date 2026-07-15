// FROZEN STANDARD (step 228) — the DASHBOARD tables & columns config. The dashboard is ONE accordion that
// holds ANY number of tables; WHAT each table draws is decided by this CONFIG, never by the data (every
// automation's data differs). A column is DATA, not JSX: the universal table renders whatever this declares
// through a CLOSED set of typed renderers (config-record-cell.client.tsx). To add or change a column, edit
// the config — never a component. This is the workspace-wide generalization of the telegram-notes tables
// (its _data/columns.ts + records-table + record-cell), lifted into _shared with no telegram dependency.
//
// The canon of what each column KIND is for (its job, its visualization, its actions, when its data is
// enough) lives in _shared/column-kinds.ts + app/(projects)/README.md "The dashboard tables & columns
// standard". Read that before authoring a table so a model can judge whether it has enough data.

/** The CLOSED set of column types. A new visualization = a new type HERE + a renderer in the registry + a
 *  note in the canon — never new JSX inside a project. */
export type ColumnType =
  | "badge"     // a small colored label (a status/category) — options.colorFrom picks the color
  | "text"      // one short line, truncated
  | "longtext"  // a long field, click to expand
  | "number"    // a right-aligned numeric value
  | "date"      // a formatted date/time; options.emphasizeIfFuture highlights upcoming ones
  | "link"      // an outward link ("Open")
  | "image"     // a thumbnail with a preview modal
  | "actions";  // a row action button (detail | delete | live)

export type ColumnOptions = {
  /** For a badge: the field whose value maps to a color, or a fixed color token. */
  colorFrom?: string;
  /** For a date: emphasize values in the future (reminders, due dates). */
  emphasizeIfFuture?: boolean;
  /** For a longtext: allow the cell to expand on click. */
  expand?: boolean;
  /** For an actions column: which action this button performs. `"live"` (step 243) fetches `liveUrl` fresh
   *  on click and shows the response in a modal — for data that goes stale (a price, a status) where the
   *  STORED row is a snapshot, not the current truth. Never writes anything — pure read. */
  action?: "detail" | "delete" | "live";
  /** For `action:"live"`: the endpoint to GET on click. `{field}` tokens are replaced with that row's own
   *  `values.field` before the request — e.g. `"/api/projects/other/x/price?ticker={ticker}"`. */
  liveUrl?: string;
  /** For a number: an optional unit/suffix shown after the value (e.g. "$", "%"). */
  suffix?: string;
};

/** One column of a dashboard table. `source` is the key in a row's `values` this column reads. */
export type TableColumn = {
  id: string;
  header: string;
  type: ColumnType;
  /** The key in a row's `values` map this column reads. */
  source: string;
  /** Shown at startup; the user's personal show/hide choice is remembered in localStorage. */
  defaultVisible: boolean;
  /** Optional pointer to an ontology attribute (a tooltip/label in the column picker). */
  attr?: string;
  options?: ColumnOptions;
};

/** One row of a table — an id plus a flat map of column-source → value. Seed rows live in the config; the
 *  live per-table data store (DB + API) is a separate later step. */
export type TableRow = { id: string; values: Record<string, unknown> };

/** One table inside the dashboard accordion. `storageKey` scopes the column-visibility choice per table. */
export type DashboardTable = {
  id: string;
  title: string;
  description?: string;
  columns: TableColumn[];
  /** Seed/demo rows rendered from the config (step 228). Absent/empty ⇒ an honest "No records yet". */
  rows?: TableRow[];
  /** localStorage key for this table's column-visibility choice. Defaults to the table id when omitted. */
  storageKey?: string;
  /** Page size for "last N + load more" pagination (step 243). Absent ⇒ the API's own default (20). */
  pageSize?: number;
};

/** The dashboard's config: the ordered set of tables the accordion renders. */
export type DashboardConfig = { tables: DashboardTable[] };

export function defaultVisibleColumnIds(cols: TableColumn[]): string[] {
  return cols.filter((c) => c.defaultVisible).map((c) => c.id);
}

export function tableStorageKey(automation: string, table: DashboardTable): string {
  return `dashboard-cols:${automation}:${table.storageKey ?? table.id}`;
}
