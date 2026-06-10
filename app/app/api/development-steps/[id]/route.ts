import { NextRequest, NextResponse } from "next/server"
import { updateStep, deleteStep, readStep, type Importance } from "@/lib/dev-steps/step-file"

// Mutate one development step by id (id = encoded file path). PATCH updates a NEW
// step in place — importance / description / name / tasks — writing the markdown
// file directly (no DB; new steps are directly editable anytime). DELETE removes a
// NEW step's file (danger zone). Completed steps are read-only: both refuse.
const VALID: Importance[] = ["optional", "mandatory", "critical"]

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cur = await readStep(id)
  if (!cur) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (cur.status !== "new") return NextResponse.json({ error: "Completed steps are read-only" }, { status: 409 })

  const body = await req.json()
  const patch: Record<string, unknown> = {}
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim()
  if (typeof body.description === "string") patch.description = body.description
  if (VALID.includes(body.importance)) patch.importance = body.importance
  if (Array.isArray(body.tasks)) patch.tasks = body.tasks

  const step = await updateStep(id, patch)
  return NextResponse.json({ step })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ok = await deleteStep(id)
  if (!ok) return NextResponse.json({ error: "Completed steps cannot be deleted" }, { status: 409 })
  return NextResponse.json({ ok: true })
}
