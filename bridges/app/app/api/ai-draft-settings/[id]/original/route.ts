import { NextRequest, NextResponse } from "next/server"
import { serviceApiGate } from "@/lib/service-auth"
import { readDraft } from "@/lib/ai-draft/draft-file"
import { readOriginal } from "@/lib/ai-draft/originals"

// Read-only: the current content of the REAL original file a draft refers to, used to
// seed the Source tab. Never writes anything. If the original is not reachable from the
// workspace, returns readable=false with a note (not an error).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await serviceApiGate(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id } = await params
  const draft = await readDraft(id)
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const original = await readOriginal(draft.agent, draft.kind, draft.target)
  return NextResponse.json(original)
}
