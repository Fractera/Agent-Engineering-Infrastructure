import { NextResponse } from "next/server"
import { scanTree } from "@/lib/crud-docs/fs"

// The real folder/file tree under CRUD-DOCS/ (ensures the root exists). Filesystem is
// the single source of truth — these are real entries on disk, not declarations.
export async function GET() {
  const tree = await scanTree()
  return NextResponse.json({ tree })
}
