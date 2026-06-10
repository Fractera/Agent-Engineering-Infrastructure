import { NextResponse } from "next/server"
import { scanTree } from "@/lib/architecture/fs-tree"

// Filesystem-sourced architecture snapshot (step 108). Scans app/app/** for
// README.md (declared) and real route files (built) — so whatever the agent does
// on disk is what the observer sees. Read-only. Drives the live tree + blink.
export async function GET() {
  const snap = await scanTree()
  return NextResponse.json(snap)
}
