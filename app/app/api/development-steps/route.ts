import { NextRequest, NextResponse } from "next/server"
import { createStep, type Importance } from "@/lib/dev-steps/step-file"

// Create a development step. POST { name, importance } writes a new markdown file
// under DEVELOPMENT-STEPS/NEW-STEPS/ (filesystem source of truth, no DB) with the
// next global number. The user can write the task here directly; more often the
// chat or MCP drafts it. Same write path for the human UI and an agent.
const VALID: Importance[] = ["optional", "mandatory", "critical"]

export async function POST(req: NextRequest) {
  const { name, importance } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: "A step name is required" }, { status: 400 })
  }
  const imp: Importance = VALID.includes(importance) ? importance : "optional"
  const step = await createStep(String(name).trim(), imp)
  return NextResponse.json({ step }, { status: 201 })
}
