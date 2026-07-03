import { NextResponse, NextRequest } from "next/server"
import { serviceApiGate } from "@/lib/service-auth"
import { scanTree } from "@/lib/crud-docs/fs"

// The real folder/file tree under CRUD-DOCS/ (ensures the root exists). Filesystem is
// the single source of truth — these are real entries on disk, not declarations.
export async function GET(req: NextRequest) {
  if (!(await serviceApiGate(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const tree = await scanTree()
  return NextResponse.json({ tree })
}
