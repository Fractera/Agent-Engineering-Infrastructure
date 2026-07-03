import { NextRequest, NextResponse } from "next/server"
import { serviceApiGate } from "@/lib/service-auth"
import { parseTaskClientId, removeTask } from "@/lib/architecture/readme-file"

// Remove a single route task (a to-do item taken off the list). The id encodes
// both the route path and the task id, so we rewrite that route's README.md
// without the task. Deletion requests (kind 'delete') are tasks too — removing
// one cancels the request.
export async function DELETE(req: NextRequest,
  { params }: { params: Promise<{ id: string }> },) {
  if (!(await serviceApiGate(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id } = await params
  const { path, taskId } = parseTaskClientId(id)
  if (path && taskId) await removeTask(path, taskId)
  return NextResponse.json({ ok: true })
}
