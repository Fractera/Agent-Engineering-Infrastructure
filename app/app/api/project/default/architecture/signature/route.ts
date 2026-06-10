import { NextResponse } from "next/server"
import { scanTree } from "@/lib/architecture/fs-scan"

// One filesystem snapshot for the live-polling /architecture tree (step 106).
// Scans app/app/** for README.md (declared) and built route files — so the tree
// reflects what is actually on disk, no DB. Returns a per-path signature of tasks
// (count + README mtime) so the client blinks ONLY the node that changed, plus
// the declared entities and projects in one round-trip. Read-only.
export async function GET() {
  const { tasksByPath, requested, projects, builtExtra } = await scanTree()
  return NextResponse.json({ tasksByPath, requested, projects, builtExtra })
}
