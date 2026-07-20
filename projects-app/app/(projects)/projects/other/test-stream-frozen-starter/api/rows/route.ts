import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { listRows } from "../../_lib/rows";

// THE ROWS DOOR of this automation (step 254.11): GET ?table=&search=&offset=&limit= →
// { rows, hasMore, source } — the same contract the universal table already speaks.
export const runtime = "nodejs";

const AUTOMATION = "other/test-stream-frozen-starter";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const table = (req.nextUrl.searchParams.get("table") ?? "history").trim();
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const offset = Number.parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10) || 0;
  const limit = Number.parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10) || 20;
  const { rows, hasMore } = await listRows(AUTOMATION, table, { search, offset, limit });
  const source = rows.length === 0 && !search.trim() && offset === 0 ? "empty" : "live";
  return NextResponse.json({ rows, hasMore, source });
}
