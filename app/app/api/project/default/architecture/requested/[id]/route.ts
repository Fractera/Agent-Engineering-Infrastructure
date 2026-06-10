import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// Remove a declared route (page/endpoint/project) — "Remove declaration" in the
// UI (step 107). Deletes the requested_routes row by id AND its route_tasks by
// the row's computed path, so no orphan tasks remain. Real deletion of a draft,
// not a request-flag (that is "Order deletion").
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const row = await db.prepare(
    "SELECT slug, base, dynamic FROM requested_routes WHERE id = ?"
  ).get(id) as { slug: string; base: string; dynamic: number } | null
  if (row) {
    const base = row.base && row.base !== "/" ? row.base : ""
    const seg = row.dynamic ? `[${row.slug}]` : row.slug
    const path = `${base}/${seg}`
    await db.prepare("DELETE FROM route_tasks WHERE path = ?").run(path)
  }
  await db.prepare("DELETE FROM requested_routes WHERE id = ?").run(id)
  return NextResponse.json({ ok: true })
}
