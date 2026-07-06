import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// One subject's full history (ontology entity 13, §D, step 195): the append-only subject_events
// timeline keyed by subject id — the "Full text" detail of a subject row. One query on the id gives
// the whole story across every automation that ever touched it (no table hopping).
export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const subject = (await db
      .prepare(`SELECT id, kind, status, owner_automation, created_at, updated_at FROM subjects WHERE id = ?`)
      .get(id)) as Record<string, unknown> | undefined;
    if (!subject) return NextResponse.json({ text: "" }, { status: 404 });
    const events = (await db
      .prepare(
        `SELECT event, from_automation, created_at FROM subject_events
          WHERE subject_id = ? ORDER BY created_at DESC LIMIT 200`,
      )
      .all(id)) as Array<Record<string, unknown>>;
    const lines = [
      `Subject ${subject.id} (${subject.kind}) — status: ${subject.status}, owned by ${subject.owner_automation}`,
      "",
      "History:",
      ...events.map(
        (e) => `• ${e.created_at}  ${e.event}  (from ${e.from_automation || "—"})`,
      ),
    ];
    return NextResponse.json({ text: lines.join("\n") });
  } catch {
    return NextResponse.json({ text: "" }, { status: 500 });
  }
}
