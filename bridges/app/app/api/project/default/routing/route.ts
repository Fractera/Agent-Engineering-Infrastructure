import { NextRequest, NextResponse } from "next/server"
import { serviceApiGate } from "@/lib/service-auth"
import { routingFiles, routeFileTree } from "@/lib/architecture/source-bundle"

// Read-only: a route's real on-disk files. `files` = the routing files
// (page.tsx, layout.tsx, not-found.tsx, …) for backward compat; `nodes` = the FULL
// file subtree (routing files + every _components/_lib/_data file, recursively),
// each leaf carrying its source for the code viewer. Feeds the /architecture tree
// so a page node opens to a complete, faithful copy of its folder (§3.13). The dir
// is resolved through route groups (service) and the [lang] segment. Never writes.
export async function GET(req: NextRequest) {
  if (!(await serviceApiGate(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const path = new URL(req.url).searchParams.get("path")
  if (!path) return NextResponse.json({ error: "path is required" }, { status: 400 })
  try {
    const [files, nodes] = await Promise.all([routingFiles(path), routeFileTree(path)])
    return NextResponse.json({ files, nodes })
  } catch {
    return NextResponse.json({ files: [], nodes: [] })
  }
}
