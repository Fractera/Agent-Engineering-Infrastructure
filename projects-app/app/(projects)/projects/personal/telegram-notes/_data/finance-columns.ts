// Finance ledger columns (step 207) — a SEPARATE table from the universal records table (owner decision).
// The finance section renders THIS declaration (headers + typed cells) against automation_finance rows.
// Kept as data (config-driven, mirrors the records ontology) so a future column = extend this list.
export type FinanceColumnType = "kind" | "amount" | "categories" | "text" | "image" | "date";
export type FinanceColumn = { id: string; header: string; type: FinanceColumnType };

export const FINANCE_COLUMNS: FinanceColumn[] = [
  { id: "kind", header: "Type", type: "kind" },
  { id: "amount", header: "Amount", type: "amount" },
  { id: "categories", header: "Categories", type: "categories" },
  { id: "summary", header: "Summary", type: "text" },
  { id: "image", header: "Receipt", type: "image" },
  { id: "created", header: "Date", type: "date" },
];
