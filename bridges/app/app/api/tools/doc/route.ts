import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { writePlatformToolsDoc } from "@/lib/tools-install";

// Пересборка `PLATFORM-TOOLS.md` по требованию.
//
// Обычно документ собирается сам при установке инструмента. Эта дверь нужна для
// случая, когда файла нет вовсе: сервер развернули, а ни один инструмент ещё не
// ставили, и документу не с чего было родиться.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ok = writePlatformToolsDoc();
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "write_failed" }, { status: 500 });
}
