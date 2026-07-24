import { type NextRequest, NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { authorize, resolveProject } from "@/lib/nodes";
import { collectNotices } from "@/app/(projects)/projects/_shared-v2/components/notifications/server/collect-notices";
import type { NoticesCore } from "@/app/(projects)/projects/_shared-v2/components/notifications/types/notifications";

// ДВЕРЬ УВЕДОМЛЕНИЙ — единый источник поводов внимания для провайдера (шаг 298). Тонкая: читает ядро
// автоматизации и зовёт `collectNotices` из микросервиса `_shared-v2/components/notifications/server`.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject(String(req.nextUrl.searchParams.get("automation") ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  try {
    const core = JSON.parse(readFileSync(join(proj.projectDir, "_data", "automation.json"), "utf8")) as NoticesCore;
    return NextResponse.json({ notices: collectNotices(core) });
  } catch {
    return NextResponse.json({ notices: [] });
  }
}
