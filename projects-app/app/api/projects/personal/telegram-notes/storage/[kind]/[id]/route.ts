import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { db } from "@/lib/db";

// DELETE one row of the three non-Records storages (step 207.20c — the owner's four integrated
// tables all carry delete): kind = finance | image | geo. Mirrors the workflow's delete-pair
// hygiene: the DB row, its vector-memory document (finance), and its link-table rows go together;
// an image/geo mark whose last link dies is deleted here EXPLICITLY (this is the registry's own
// delete, not a record delete). Role-gated like the records route.
export const runtime = "nodejs";

const PROJECT = "telegram-notes";
const WRITE_ROLES = ["architect", "manager", "agent"];
const RAG_URL = (process.env.LIGHTRAG_URL ?? "http://localhost:9621").replace(/\/+$/, "");
const RAG_KEY = process.env.LIGHTRAG_API_KEY ?? "";

async function deleteVectorDoc(trackId: string): Promise<boolean> {
  try {
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
      headers: { "Content-Type": "application/json", "X-API-Key": RAG_KEY },
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
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const session = await getSession(req);
  if (!session?.roles?.some((r) => WRITE_ROLES.includes(r))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { kind, id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }

  try {
    if (kind === "finance") {
      const row = (await db
        .prepare("SELECT memory_track_id FROM automation_finance WHERE id = ? AND project = ?")
        .get(id, PROJECT)) as { memory_track_id?: string } | null;
      if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
      const memoryDeleted = row.memory_track_id ? await deleteVectorDoc(String(row.memory_track_id)) : false;
      // Release the links; an image/geo mark whose LAST link died goes back to pending (the
      // registry row itself survives — same rule as the workflow's deleteRecordPair).
      const imgLinks = (await db
        .prepare("SELECT image_id FROM record_images WHERE record_kind = 'finance' AND record_id = ?")
        .all(id)) as Array<{ image_id: number }>;
      await db.prepare("DELETE FROM record_images WHERE record_kind = 'finance' AND record_id = ?").run(id);
      for (const l of imgLinks) {
        const still = (await db.prepare("SELECT 1 FROM record_images WHERE image_id = ? LIMIT 1").get(l.image_id)) as unknown;
        if (!still) await db.prepare("UPDATE automation_images SET status = 'pending' WHERE id = ?").run(l.image_id);
      }
      const geoLinks = (await db
        .prepare("SELECT geo_id FROM record_geo WHERE record_kind = 'finance' AND record_id = ?")
        .all(id)) as Array<{ geo_id: number }>;
      await db.prepare("DELETE FROM record_geo WHERE record_kind = 'finance' AND record_id = ?").run(id);
      for (const l of geoLinks) {
        const still = (await db.prepare("SELECT 1 FROM record_geo WHERE geo_id = ? LIMIT 1").get(l.geo_id)) as unknown;
        if (!still) await db.prepare("UPDATE automation_geo SET status = 'pending' WHERE id = ?").run(l.geo_id);
      }
      await db.prepare("DELETE FROM automation_finance WHERE id = ? AND project = ?").run(id, PROJECT);
      return NextResponse.json({ ok: true, memoryDeleted });
    }

    if (kind === "image") {
      const row = (await db
        .prepare("SELECT 1 FROM automation_images WHERE id = ? AND project = ?")
        .get(id, PROJECT)) as unknown;
      if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
      await db.prepare("DELETE FROM record_images WHERE image_id = ?").run(id);
      await db.prepare("DELETE FROM automation_images WHERE id = ? AND project = ?").run(id, PROJECT);
      return NextResponse.json({ ok: true });
    }

    if (kind === "geo") {
      const row = (await db
        .prepare("SELECT 1 FROM automation_geo WHERE id = ? AND project = ?")
        .get(id, PROJECT)) as unknown;
      if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
      await db.prepare("DELETE FROM record_geo WHERE geo_id = ?").run(id);
      await db.prepare("DELETE FROM automation_geo WHERE id = ? AND project = ?").run(id, PROJECT);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unknown kind" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "delete failed" },
      { status: 500 },
    );
  }
}
