import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { loadActivation } from "@/lib/activation";
import { readAutomationType } from "@/app/(projects)/projects/_shared/automation-type-reader";

// AN AUTOMATION'S ACTIVATION DECLARATION (step 241 E3) — GET ?automation=<cat/slug>
//   -> { type, designed, schema }
//
// This is what the launch control panel renders itself from: the automation's OWN _data/activation.ts, which
// declares the settings ONE RUN of it takes (custom to that automation — the product presumes none of them).
// `designed:false` is not an error: it is the honest state of an instanced automation whose fork activation a
// coding agent has not built yet, and the panel says exactly that, with a way forward (the step-239 design
// surface) rather than a dead end.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const [type, schema] = await Promise.all([
    readAutomationType(proj.projectDir, proj.automation),
    loadActivation(proj.automation),
  ]);

  return NextResponse.json({
    automation: proj.automation,
    type,
    designed: Boolean(schema?.params?.length),
    schema: schema ?? { params: [] },
  });
}
