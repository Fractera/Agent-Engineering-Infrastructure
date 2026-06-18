import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { readOriginal } from "@/lib/ai-draft/originals"
import { coderSkillFile } from "@/lib/architecture/skills-tree"

// Read-only: the full text of one real skill file, for the /ai-core detail panel to show
// when a skill leaf is selected. Same read-only-original contract as the AI-Draft Source
// tab — it never writes. Hermes' skills resolve through the shared allow-list in
// originals.ts; a coding platform's skill is its <dotdir>/skills/<name>/SKILL.md.
// The name is reduced to a bare slug so no path can escape the skill roots.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const agent = (sp.get("agent") ?? "").trim()
  const name = (sp.get("name") ?? "").replace(/[^a-zA-Z0-9._-]/g, "")
  if (!agent || !name) {
    return NextResponse.json({ error: "agent and name are required" }, { status: 400 })
  }

  // Hermes keeps flat *.md skills where its agent loads them — reuse the shared resolver.
  if (agent === "hermes") {
    const original = await readOriginal("hermes", "skill", name)
    return NextResponse.json(original)
  }

  const path = coderSkillFile(agent, name)
  if (!path) {
    return NextResponse.json(
      { content: "", readable: false, path: null, language: "markdown", note: `Unknown agent "${agent}".` },
    )
  }
  try {
    const content = await readFile(path, "utf8")
    return NextResponse.json({ content, readable: true, path, language: "markdown" })
  } catch {
    return NextResponse.json({
      content: "", readable: false, path: null, language: "markdown",
      note: "The skill file is not reachable from the workspace.",
    })
  }
}
