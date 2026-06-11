import { NextRequest, NextResponse } from "next/server"
import { updatePattern, deletePattern } from "@/lib/patterns/pattern-file"
import type { Pattern, PatternStatus } from "@/lib/patterns/pattern-format"

// Mutate one pattern / anti-pattern by id (id = encoded file path). PATCH updates it
// in place — name / description / code / status / tasks — writing the markdown file
// directly (no DB; patterns are living, editable anytime). DELETE removes the file
// (danger zone). Status drives the tree colour: "declared" = amber + (req); "stable"
// with open tasks = (req); otherwise plain. Same write path for the UI and an agent.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const patch: Partial<Pick<Pattern, "name" | "description" | "code" | "status" | "tasks">> = {}
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim()
  if (typeof body.description === "string") patch.description = body.description
  if (typeof body.code === "string") patch.code = body.code
  if (body.status === "declared" || body.status === "stable") patch.status = body.status as PatternStatus
  if (Array.isArray(body.tasks)) patch.tasks = body.tasks

  const pattern = await updatePattern(id, patch)
  if (!pattern) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ pattern })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ok = await deletePattern(id)
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 })
}
