import { NextRequest, NextResponse } from "next/server"
import { updateDraft, deleteDraft } from "@/lib/ai-draft/draft-file"
import type { Draft, DraftMode } from "@/lib/ai-draft/draft-format"

// Mutate one draft by id (id = encoded file path). PATCH updates it in place —
// name / mode (supplement|replace) / tasks (wishes + deletion requests) — writing the
// markdown file directly (no DB). DELETE removes the file (Danger zone → Remove
// declaration). Target drives the tree colour: target null = declared (amber + req);
// target set with open tasks = (req) badge only. Same write path for the UI and an agent.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const patch: Partial<Pick<Draft, "name" | "mode" | "source" | "tasks">> = {}
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim()
  if (body.mode === "supplement" || body.mode === "replace") patch.mode = body.mode as DraftMode
  if (typeof body.source === "string") patch.source = body.source
  if (Array.isArray(body.tasks)) patch.tasks = body.tasks

  const draft = await updateDraft(id, patch)
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ draft })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ok = await deleteDraft(id)
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 })
}
