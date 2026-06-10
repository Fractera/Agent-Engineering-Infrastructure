import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// Remove a declared project — "Remove declaration" in the UI (step 107).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  await db.prepare("DELETE FROM projects WHERE id = ?").run(id)
  return NextResponse.json({ ok: true })
}
