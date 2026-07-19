import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { analyzeNutrition } from "../../_nodes/lookup-price/functions";

// THE "LIVE" ACTION ROUTE for this automation's History table (step 243, table-config.ts `action:"live"`).
//   GET ?dish=<name>[&grams=<number>]  ->  { dishName, weightGrams, calories, proteins, fats, carbs }
// Thin and READ-ONLY: reuses the exact analyzeNutrition() the nutrition node calls during a real run,
// never records anything. The legacy `ticker` query name stays accepted as an alias for `dish` —
// existing parameter names are a public contract (WIRING-RULES law 5); old callers keep working.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const q = req.nextUrl.searchParams;
  const dish = (q.get("dish") ?? q.get("ticker") ?? "").trim();
  if (!dish) return NextResponse.json({ error: "missing dish" }, { status: 400 });
  const grams = Number(q.get("grams") ?? "100") || 100;
  try {
    const n = await analyzeNutrition(dish, grams);
    return NextResponse.json(n);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "lookup failed" }, { status: 502 });
  }
}
