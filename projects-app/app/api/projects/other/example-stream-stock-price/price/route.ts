import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { fetchPrice } from "@/app/(projects)/projects/other/example-stream-stock-price/_nodes/lookup-price/functions";

// THE "LIVE" ACTION ROUTE for this automation's History table (step 243, table-config.ts `action:"live"`).
//   GET ?ticker=<symbol>  ->  { ticker, price, asOf }
//
// Per-automation, thin, and READ-ONLY: it reuses the EXACT SAME `fetchPrice` function the "lookup-price" node
// calls during a real run (co-location preserved — delete this automation and this route's target vanishes
// with it), but never records anything. The stored `price` in the table is a snapshot from whenever the ask
// happened; this button proves the current value, without polluting the History table with a second row.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const ticker = (req.nextUrl.searchParams.get("ticker") ?? "").trim();
  if (!ticker) return NextResponse.json({ error: "missing ticker" }, { status: 400 });

  try {
    const quote = await fetchPrice(ticker);
    return NextResponse.json({ ticker, price: quote.price, asOf: quote.asOf });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "lookup failed" }, { status: 502 });
  }
}
