import { NextRequest, NextResponse } from "next/server"
import { decodePath, removeRouteReadme } from "@/lib/architecture/readme-file"

// Remove a declared project — "Remove declaration" in the UI (step 107). The id
// is the project's encoded path (fs:…); we delete its folder's README.md (and the
// now-empty folder). Falls back to a bare slug for resilience.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const path = id.startsWith("fs:")
    ? decodePath(id)
    : `/project/${id.replace(/^project-/, "")}`
  await removeRouteReadme(path)
  return NextResponse.json({ ok: true })
}
