import { NextRequest, NextResponse } from "next/server"
import { listTree, createDraft } from "@/lib/ai-draft/draft-file"
import type { DraftMode } from "@/lib/ai-draft/draft-format"

// AI Draft Settings tree + declare. GET ensures the AI-DRAFT-SETTINGS/ skeleton (six
// agent folders, each with its seeded instruction doc(s) + empty SKILLS/MCP) and
// returns the merged tree: real skills/MCP as read-only reference, with any draft laid
// over them, plus new drafts. Filesystem source of truth (no DB). Static by design —
// there is no /signature poll; the client fetches on mount and refetches after a write.
export async function GET() {
  const tree = await listTree()
  return NextResponse.json(tree)
}

// Declare a new draft in an agent's SKILLS or MCP group. POST { agent, kind, name,
// mode, target? }. target null = a brand-new record (orange + req); target set = a
// supplement/replace overlay on a real original (black name + req badge). Same write
// path for the human UI and an agent.
export async function POST(req: NextRequest) {
  const { agent, kind, name, mode, target } = await req.json()
  if (kind !== "skill" && kind !== "mcp") {
    return NextResponse.json({ error: "kind must be 'skill' or 'mcp'" }, { status: 400 })
  }
  if (!name?.trim()) {
    return NextResponse.json({ error: "A name is required" }, { status: 400 })
  }
  const m: DraftMode = mode === "replace" ? "replace" : "supplement"
  const draft = await createDraft(String(agent), kind, String(name).trim(), m, target ? String(target) : null)
  if (!draft) return NextResponse.json({ error: "Unknown agent" }, { status: 400 })
  return NextResponse.json({ draft }, { status: 201 })
}
