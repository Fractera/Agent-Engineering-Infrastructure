import type { NodeFunction } from "../../../../_shared/node-contract";
import { addRow } from "@/lib/dashboard-rows";

// REAL, deterministic application function of "record-result" (step 243) — no AI. Writes through the
// EXISTING rows API (steps 228/229 — lib/dashboard-rows.ts, the same store the owner's "Add row" writes to),
// never a bespoke table of its own; deleting the automation takes its history with it.
export async function recordLookup(company: string, ticker: string, price: number): Promise<{ rowId: string }> {
  const row = await addRow("other/example-stream-stock-price", "history", {
    date: new Date().toISOString(),
    company,
    ticker,
    price,
  });
  return { rowId: row.id };
}

export const FUNCTIONS: NodeFunction[] = [
  {
    name: "recordLookup",
    paramsIn: { company: "string", ticker: "string", price: "number" },
    returns: "{ rowId: string }",
    rules: ["deterministic; no AI inside the app", "reached only when parse-request and lookup-price both succeeded"],
  },
];
