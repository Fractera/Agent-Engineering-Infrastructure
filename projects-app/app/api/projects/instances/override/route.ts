import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { instanceById, setInstanceOverrides } from "@/lib/instances-store";

// Set a per-node OVERRIDE on an Instance (step 223.C.4) — how a run is edited node by node without
// touching the Master or sibling Instances. Merges { disabledFunctions[], note } for one node into the
// Instance's overrides JSON. NOTE: async db — every query awaited. Role-gated.
export const runtime = "nodejs";

const ROLES = ["architect", "manager", "agent"];

type Row = { overrides: string };

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.roles?.some((r) => ROLES.includes(r))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let body: { instanceId?: string; nodeId?: string; disabledFunctions?: string[]; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const instanceId = (body.instanceId ?? "").trim();
  const nodeId = (body.nodeId ?? "").trim();
  if (!instanceId || !nodeId) {
    return NextResponse.json({ error: "instanceId and nodeId are required" }, { status: 400 });
  }
  const disabledFunctions = Array.isArray(body.disabledFunctions)
    ? body.disabledFunctions.filter((f) => typeof f === "string")
    : [];
  const note = typeof body.note === "string" ? body.note : "";

  const row = (await instanceById(instanceId)) as Row | undefined;
  if (!row) return NextResponse.json({ error: "instance not found" }, { status: 404 });

  let overrides: Record<string, { disabledFunctions?: string[]; note?: string }>;
  try {
    overrides = JSON.parse(row.overrides ?? "{}");
  } catch {
    overrides = {};
  }
  // An empty override (no disabled functions, no note) clears the node's entry.
  if (disabledFunctions.length === 0 && !note) delete overrides[nodeId];
  else overrides[nodeId] = { disabledFunctions, note };

  await setInstanceOverrides(instanceId, JSON.stringify(overrides));

  return NextResponse.json({ ok: true, nodeId, overrides: overrides[nodeId] ?? null });
}
