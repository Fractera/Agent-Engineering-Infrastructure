import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// Remove a glossary entry by id (step 107).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  await db.prepare("DELETE FROM glossary WHERE id = ?").run(id)
  return NextResponse.json({ ok: true })
}
