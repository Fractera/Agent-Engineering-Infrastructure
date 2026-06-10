import { NextRequest, NextResponse } from "next/server"
import { routingFiles } from "@/lib/architecture/source-bundle"

// Read-only: the routing files (page.tsx, layout.tsx, …) that actually exist for
// a route. Feeds the /architecture tree so a page node renders as a folder that
// opens to its routing files only (§3.13). Never writes.
export async function GET(req: NextRequest) {
  const path = new URL(req.url).searchParams.get("path")
  if (!path) return NextResponse.json({ error: "path is required" }, { status: 400 })
  try {
    const files = await routingFiles(path)
    return NextResponse.json({ files })
  } catch {
    return NextResponse.json({ files: [] })
  }
}
