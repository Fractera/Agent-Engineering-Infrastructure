import { NextRequest, NextResponse } from "next/server"
import { collectSource } from "@/lib/architecture/source-bundle"

// Read-only source bundle for a route — its page.tsx/route.ts + _components/*.
// Feeds the /architecture code viewer (screen translation, §3.13). GET only;
// never writes. Editing in the UI produces a route_tasks request, not a file write.
export async function GET(req: NextRequest) {
  const path = new URL(req.url).searchParams.get("path")
  if (!path) return NextResponse.json({ error: "path is required" }, { status: 400 })
  try {
    const files = await collectSource(path)
    return NextResponse.json({ files })
  } catch {
    return NextResponse.json({ error: "could not read source" }, { status: 400 })
  }
}
