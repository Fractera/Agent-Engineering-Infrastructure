import { NextResponse } from "next/server"
import { listTree } from "@/lib/patterns/pattern-file"
import type { Pattern } from "@/lib/patterns/pattern-format"

// One filesystem snapshot for the live-polling /patterns view, mirroring the
// architecture/development-steps signature routes (steps 106/108/109). Scans
// PATTERNS/ (no DB) and returns the category tree + flat anti-patterns plus a
// per-node signature (status + task count + file mtime) so the client blinks ONLY
// the node that changed — a declared pattern, an edited description/code, or an
// added task all flip the signature; a brand-new node shows up as a new id.
function sig(p: Pattern): string {
  return `${p.status}:${p.tasks.length}:${p.mtime}`
}

export async function GET() {
  const { categories, anti } = await listTree()
  const signature: Record<string, string> = {}
  for (const p of [...anti, ...categories.flatMap(c => c.patterns)]) signature[p.id] = sig(p)
  return NextResponse.json({ categories, anti, signature })
}
