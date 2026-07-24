import { type NextRequest, NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { authorize, resolveProject } from "@/lib/nodes";
import { collectWarnings } from "@/app/(projects)/projects/_shared-v2/components/warnings/server/collect-warnings";
import type { WarningsCore } from "@/app/(projects)/projects/_shared-v2/components/warnings/types/warnings";

// ДВЕРЬ ПРЕДУПРЕЖДЕНИЙ — единый источник открытых проблем для провайдера Центра проблем (шаг 298). Тонкая:
// читает ядро автоматизации и зовёт `collectWarnings` из микросервиса `_shared-v2/components/warnings/server`.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject(String(req.nextUrl.searchParams.get("automation") ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  try {
    const core = JSON.parse(readFileSync(join(proj.projectDir, "_data", "automation.json"), "utf8")) as WarningsCore;
    return NextResponse.json({ warnings: collectWarnings(core) });
  } catch {
    return NextResponse.json({ warnings: [] });
  }
}
