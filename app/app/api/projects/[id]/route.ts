import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { removeRouteReadme } from "@/lib/declared-readme"

// Remove a declared project — "Remove declaration" in the UI (step 107).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const row = await db.prepare("SELECT slug FROM projects WHERE id = ?").get(id) as { slug: string | null } | null
  await db.prepare("DELETE FROM projects WHERE id = ?").run(id)
  if (row?.slug) await removeRouteReadme(`/project/${row.slug}`)
  return NextResponse.json({ ok: true })
}
