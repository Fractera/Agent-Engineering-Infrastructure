import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { noteType } from "@/app/(projects)/projects/personal/telegram-notes/_lib/note-type";

// One telegram_notes row: GET the full original text (Phase 3, the "Full text" modal) and
// DELETE the record from BOTH stores (188-R V2.5 Record delete contract): the SQLite row AND
// its vector-memory document (best-effort). Role-gated.
export const runtime = "nodejs";

const READ_ROLES = ["architect", "manager", "agent"];
const WRITE_ROLES = ["architect", "manager", "agent"];
const RAG_URL = (process.env.LIGHTRAG_URL ?? "http://localhost:9621").replace(/\/+$/, "");
const RAG_KEY = process.env.LIGHTRAG_API_KEY ?? "";

type Row = {
  id: number;
  hook_action: string;
  summary: string;
  full_text: string;
  reminder_due: number | null;
  created_at: number;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession(req);
  if (!session?.roles?.some((r) => READ_ROLES.includes(r))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const row = (await db
      .prepare(
        `SELECT id, hook_action, summary, full_text, reminder_due, created_at
           FROM telegram_notes WHERE id = ? AND project_slug = 'telegram-notes'`,
      )
      .get(id)) as Row | null;
    if (!row) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: String(row.id),
      type: noteType(row.hook_action),
      summary: row.summary,
      fullText: row.full_text,
      reminderDue: row.reminder_due,
      createdAt: row.created_at,
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

// Resolve a LightRAG track id to its vector document id(s), then delete them. Best-effort:
// any failure is swallowed and reported as memoryDeleted=false — the DB row is already gone.
async function deleteVectorDoc(trackId: string): Promise<boolean> {
  try {
    const headers = { "Content-Type": "application/json", "X-API-Key": RAG_KEY };
    const st = await fetch(`${RAG_URL}/documents/track_status/${encodeURIComponent(trackId)}`, {
      headers: { "X-API-Key": RAG_KEY },
      signal: AbortSignal.timeout(15_000),
    });
    if (!st.ok) return false;
    const data = (await st.json()) as { documents?: Array<{ id?: string }> };
    const docIds = (data.documents ?? []).map((d) => d.id).filter(Boolean) as string[];
    if (!docIds.length) return false;
    const del = await fetch(`${RAG_URL}/documents/delete_document`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ doc_ids: docIds }),
      signal: AbortSignal.timeout(30_000),
    });
    return del.ok;
  } catch {
    return false;
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession(req);
  if (!session?.roles?.some((r) => WRITE_ROLES.includes(r))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  try {
    // Read the memory reference BEFORE deleting the row.
    const row = (await db
      .prepare(
        "SELECT id, memory_track_id FROM telegram_notes WHERE id = ? AND project_slug = 'telegram-notes'",
      )
      .get(id)) as { id: number; memory_track_id: string | null } | null;
    if (!row) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    // Store 1: the SQLite row (this is what the records table renders).
    await db.prepare("DELETE FROM telegram_notes WHERE id = ?").run(id);
    // Store 2: the vector document — best-effort; the owner is never blocked by a memory hiccup.
    const memoryDeleted = row.memory_track_id ? await deleteVectorDoc(row.memory_track_id) : false;
    return NextResponse.json({ ok: true, memoryDeleted });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "delete failed" },
      { status: 500 },
    );
  }
}
