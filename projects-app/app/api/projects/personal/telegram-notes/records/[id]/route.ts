import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { db } from "@/lib/db";
import {
  PROJECT_COLUMNS,
  RECORD_TABLE,
} from "@/app/(projects)/projects/personal/telegram-notes/_data/columns";

// One record of the universal records table (ontology entity 12 Record): GET the full detail
// text (the "Full text" modal) and DELETE the record from BOTH stores (the Record delete
// contract, 188-R): the DB row AND — best-effort — its vector-memory document. Role-gated.
export const runtime = "nodejs";

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const WRITE_ROLES = ["architect", "manager", "agent"];
const RAG_URL = (process.env.LIGHTRAG_URL ?? "http://localhost:9621").replace(/\/+$/, "");
const RAG_KEY = process.env.LIGHTRAG_API_KEY ?? "";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!RECORD_TABLE || !IDENT.test(RECORD_TABLE)) {
    return NextResponse.json({ text: "" });
  }
  try {
    const row = (await db
      .prepare(`SELECT * FROM ${RECORD_TABLE} WHERE id = ?`)
      .get(id)) as Record<string, unknown> | undefined;
    if (!row) {
      return NextResponse.json({ text: "" }, { status: 404 });
    }
    // Prefer an explicit full_text column; else join the longtext columns; else dump the row.
    const longtext = PROJECT_COLUMNS.filter((c) => c.type === "longtext")
      .map((c) => String(row[c.source] ?? ""))
      .filter(Boolean)
      .join("\n\n");
    const text =
      typeof row.full_text === "string" && row.full_text
        ? row.full_text
        : longtext ||
          Object.entries(row)
            .map(([k, v]) => `${k}: ${v ?? ""}`)
            .join("\n");
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ text: "" }, { status: 500 });
  }
}

// Resolve a LightRAG track id to its vector document id(s) and delete them. Best-effort: any
// failure is swallowed and reported as memoryDeleted=false — the DB row is already gone.
async function deleteVectorDoc(trackId: string): Promise<boolean> {
  try {
    const st = await fetch(
      `${RAG_URL}/documents/track_status/${encodeURIComponent(trackId)}`,
      { headers: { "X-API-Key": RAG_KEY }, signal: AbortSignal.timeout(15_000) },
    );
    if (!st.ok) return false;
    const data = (await st.json()) as { documents?: Array<{ id?: string }> };
    const docIds = (data.documents ?? []).map((d) => d.id).filter(Boolean) as string[];
    if (!docIds.length) return false;
    const del = await fetch(`${RAG_URL}/documents/delete_document`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "X-API-Key": RAG_KEY },
      body: JSON.stringify({ doc_ids: docIds }),
      signal: AbortSignal.timeout(30_000),
    });
    return del.ok;
  } catch {
    return false;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session?.roles?.some((r) => WRITE_ROLES.includes(r))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  if (!RECORD_TABLE || !IDENT.test(RECORD_TABLE)) {
    return NextResponse.json({ error: "no record table" }, { status: 400 });
  }
  try {
    const row = (await db
      .prepare(`SELECT * FROM ${RECORD_TABLE} WHERE id = ?`)
      .get(id)) as Record<string, unknown> | undefined;
    if (!row) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    await db.prepare(`DELETE FROM ${RECORD_TABLE} WHERE id = ?`).run(id);
    // Best-effort vector delete when the automation stored a memory id at ingest.
    const track = (row.memory_track_id ?? row.memory_doc_id) as string | undefined;
    const memoryDeleted = track ? await deleteVectorDoc(String(track)) : false;
    return NextResponse.json({ ok: true, memoryDeleted });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "delete failed" },
      { status: 500 },
    );
  }
}
