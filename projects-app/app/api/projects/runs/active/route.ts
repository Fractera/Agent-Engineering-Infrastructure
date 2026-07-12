import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { db } from "@/lib/db";

// Active run of an automation (step 223.C.3) — the read side of the unified run model. Returns the most
// recent RUNNING run for automation="<category>/<slug>" plus its per-node statuses, so the diagram
// canvas can highlight the current node (orange) and tint the finished ones. Role-gated like the other
// project routes. This is how "which node is working now" is answered (README §7).
export const runtime = "nodejs";

const ROLES = ["architect", "manager", "agent"];

type RunRow = { id: string; current_node: string | null; status: string; instance_id: string | null };
type NodeRow = { node_id: string; status: string };

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.roles?.some((r) => ROLES.includes(r))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const automation = (req.nextUrl.searchParams.get("automation") ?? "").trim();
  if (!automation) return NextResponse.json({ run: null, nodes: {} });

  const run = (await db
    .prepare(
      `SELECT id, current_node, status, instance_id FROM automation_runs
       WHERE automation = ? AND status = 'running'
       ORDER BY started_at DESC LIMIT 1`,
    )
    .get(automation)) as RunRow | undefined;

  if (!run) return NextResponse.json({ run: null, nodes: {} });

  const rows = (await db
    .prepare(`SELECT node_id, status FROM automation_run_nodes WHERE run_id = ?`)
    .all(run.id)) as NodeRow[];
  const nodes: Record<string, string> = {};
  for (const r of rows) nodes[r.node_id] = r.status;

  return NextResponse.json({ run, nodes });
}
