import type { ColumnType } from "./table-config";

// THE COLUMN CANON (step 228) — the machine-readable standard of what each column KIND is for. A model
// designing a dashboard table reads this to decide, per column: which type fits the job, what the type
// visualizes, which actions it supports, and — crucially — WHAT DATA IT NEEDS, so it can judge whether it
// has ENOUGH data to draw that column or should ask for more / drop it. This is the code twin of the README
// section "The dashboard tables & columns standard"; keep the two in step.
//
// The set is CLOSED: a genuinely new visualization is a new ColumnType here + a renderer in
// config-record-cell.client.tsx + a line in the README — never new JSX inside a project.

export type ColumnKind = {
  type: ColumnType;
  /** What job this column does — when a model should reach for it. */
  purpose: string;
  /** How it is drawn (the visualization the closed renderer produces). */
  visualization: string;
  /** What a row must provide for this column to be meaningful. If the data cannot supply this, the column
   *  is NOT justified — the model should drop it or gather the data first. */
  needs: string;
  /** The options this type honours (from ColumnOptions). */
  options: string[];
  /** Whether this type is interactive (an action) rather than a value. */
  action?: boolean;
};

export const COLUMN_KINDS: Record<ColumnType, ColumnKind> = {
  badge: {
    type: "badge",
    purpose: "Show a short categorical state — a status, a type, a label the row belongs to.",
    visualization: "A small colored pill. The color comes from options.colorFrom (a value field or a fixed token).",
    needs: "A SHORT enumerable value (a status/category), ideally with a companion color field. Not free text.",
    options: ["colorFrom"],
  },
  text: {
    type: "text",
    purpose: "Show one short scalar field — a name, a topic, a code.",
    visualization: "One truncated line with the full value on hover.",
    needs: "A short string. If the value is long, use longtext instead.",
    options: [],
  },
  longtext: {
    type: "longtext",
    purpose: "Show a long field — a summary, a description, a note.",
    visualization: "One clamped line that expands on click.",
    needs: "A long string worth reading in full. Justified only when rows actually carry long text.",
    options: ["expand"],
  },
  number: {
    type: "number",
    purpose: "Show a numeric measure to compare or total — a count, an amount, a score.",
    visualization: "Right-aligned, thousands-formatted, with an optional suffix (options.suffix, e.g. $ or %).",
    needs: "A numeric value. If it is really a category, use badge; if it is a date, use date.",
    options: ["suffix"],
  },
  date: {
    type: "date",
    purpose: "Show WHEN something happened or is due.",
    visualization: "A localized date/time; options.emphasizeIfFuture highlights upcoming values (reminders, due dates).",
    needs: "A parseable date (ISO string or a unix timestamp). Absent dates render as an em dash.",
    options: ["emphasizeIfFuture"],
  },
  link: {
    type: "link",
    purpose: "Point out to an external resource the row references.",
    visualization: 'An "Open" link (new tab).',
    needs: "A URL. Justified only when rows carry an outward address.",
    options: [],
  },
  image: {
    type: "image",
    purpose: "Show a visual the row owns — a cover, a photo, a receipt.",
    visualization: "A small thumbnail.",
    needs: "An image URL. Absent images render as an em dash.",
    options: [],
  },
  actions: {
    type: "actions",
    purpose: "Let the user act on the row — see its full detail, or delete it.",
    visualization: 'A ghost button: "Details" (options.action=detail) or a trash icon (options.action=delete).',
    needs: "The row id (source=id). One actions column per action; keep them last.",
    options: ["action"],
    action: true,
  },
};

/** A model can call this to check a column declaration against the canon before emitting it. */
export function columnKind(type: ColumnType): ColumnKind {
  return COLUMN_KINDS[type];
}
