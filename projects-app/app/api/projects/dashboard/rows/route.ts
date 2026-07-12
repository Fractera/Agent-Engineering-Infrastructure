import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { addRow, listRows } from "@/lib/dashboard-rows";

// THE DASHBOARD ROWS API (step 229) — the live data store behind the config dashboard tables. Both the
// owner (via the UI) and the automation's own nodes (via this API, role `agent`) write rows here.
//   GET  ?automation=<cat/slug>&table=<id>&search=&offset=  -> { rows, hasMore, source: "live"|"empty" }
//   POST { automation, table, values }                      -> the created row
// The client falls back to the config's SEED rows only when the live store is empty (source:"empty") — so a
// fresh dashboard is never blank, and the first written row replaces the demo.
export const runtime = "nodejs";

const SLUG = /^[a-z][a-z0-9-]*$/;

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const table = (req.nextUrl.searchParams.get("table") ?? "").trim();
  if (!SLUG.test(table)) return NextResponse.json({ error: "invalid table id" }, { status: 400 });

  const search = req.nextUrl.searchParams.get("search") ?? "";
  const offset = Number.parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10) || 0;
  const { rows, hasMore } = await listRows(proj.automation, table, { search, offset });
  // "empty" only when the FIRST page with no search is empty — that is when the client shows the seed.
  const source = rows.length === 0 && !search.trim() && offset === 0 ? "empty" : "live";
  return NextResponse.json({ rows, hasMore, source });
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as
    | { automation?: string; table?: string; values?: Record<string, unknown> }
    | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const table = String(body?.table ?? "").trim();
  if (!SLUG.test(table)) return NextResponse.json({ error: "invalid table id" }, { status: 400 });
  const values = body?.values && typeof body.values === "object" ? body.values : {};

  const row = await addRow(proj.automation, table, values);
  return NextResponse.json({ ok: true, row });
}
