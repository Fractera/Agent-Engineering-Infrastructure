import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject, createDraftNode } from "@/lib/nodes";
import { NODE_STUB_SPEC } from "@/lib/wave";

// Create a DRAFT node (step 224 L3) — a thin wrapper since step 250: the whole write path lives in
// createDraftNode (lib/nodes.ts), shared with the in-product develop agent's tool executor. NO build —
// the canvas reads the index, so the draft appears instantly; the build follows at materialize time.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as
    | { automation?: string; name?: string; spec?: string; parentCuid?: string }
    | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  // The stub is a SHARED constant (lib/wave.ts): the launch gate recognises it and refuses to hand a
  // never-described node to a coding agent (step 247 П5).
  const created = await createDraftNode(proj, {
    name: String(body?.name ?? ""),
    spec: String(body?.spec ?? "").trim() || NODE_STUB_SPEC,
    parentCuid: body?.parentCuid ? String(body.parentCuid) : null,
  });
  return NextResponse.json({ ok: true, ...created, automation: proj.automation, draft: true });
}
