import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { fetchPrice } from "../../_nodes/lookup-price/functions";

// THE "LIVE" ACTION ROUTE for this automation's History table (step 243, table-config.ts `action:"live"`).
//   GET ?ticker=<symbol>  ->  { ticker, price, asOf }
// Thin and READ-ONLY: reuses the exact fetchPrice() the "lookup-price" node calls during a real run, but
// never records anything — the stored price is a snapshot, this proves the current value without a second row.
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
