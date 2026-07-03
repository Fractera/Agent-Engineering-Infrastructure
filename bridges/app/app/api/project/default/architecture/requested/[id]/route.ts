import { NextRequest, NextResponse } from "next/server"
import { serviceApiGate } from "@/lib/service-auth"
import { decodePath, removeRouteReadme } from "@/lib/architecture/readme-file"

// Remove a declared route (page/endpoint/project) — "Remove declaration" in the
// UI (step 107). The id encodes the entity's path; we delete its README.md (and
// the now-empty folder), which also drops its tasks since they live in that file.
// Real deletion of a draft, not a request-flag (that is "Order deletion").
export async function DELETE(req: NextRequest,
  { params }: { params: Promise<{ id: string }> },) {
  if (!(await serviceApiGate(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id } = await params
  await removeRouteReadme(decodePath(id))
  return NextResponse.json({ ok: true })
}
