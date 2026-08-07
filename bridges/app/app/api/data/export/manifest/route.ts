import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { BACKUP_PARTS, partSize } from "@/lib/backup-parts";

// What the export dialog shows before anything is downloaded: every part, what it
// really is, how big it is, and whether it carries credentials.
export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parts = BACKUP_PARTS.map((p) => ({
    id: p.id,
    label: p.label,
    note: p.note,
    secret: p.secret === true,
    defaultOn: p.defaultOn,
    bytes: partSize(p),
  }));

  return NextResponse.json({ parts }, { headers: { "Cache-Control": "no-store" } });
}
