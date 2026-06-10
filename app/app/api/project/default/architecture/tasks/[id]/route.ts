import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { syncRouteReadme } from "@/lib/declared-readme"

// Remove a route task (a to-do item the user took off the list). Deletion
// requests (kind 'delete') are also rows here; removing one cancels the request.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const row = await db.prepare("SELECT path FROM route_tasks WHERE id = ?").get(id) as { path: string } | null
  await db.prepare("DELETE FROM route_tasks WHERE id = ?").run(id)
  if (row?.path) await syncRouteReadme(row.path)
  return NextResponse.json({ ok: true })
}
