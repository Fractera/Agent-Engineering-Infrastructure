import { NextRequest, NextResponse } from "next/server"
import { parseTaskClientId, removeTask } from "@/lib/architecture/readme-file"

// Remove a single route task (a to-do item taken off the list). The id encodes
// both the route path and the task id, so we rewrite that route's README.md
// without the task. Deletion requests (kind 'delete') are tasks too — removing
// one cancels the request.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { path, taskId } = parseTaskClientId(id)
  if (path && taskId) await removeTask(path, taskId)
  return NextResponse.json({ ok: true })
}
