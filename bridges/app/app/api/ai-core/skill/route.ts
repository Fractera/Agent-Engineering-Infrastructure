import { NextRequest, NextResponse } from "next/server"
import { serviceApiGate } from "@/lib/service-auth"
import { readFile } from "fs/promises"
import { readOriginal } from "@/lib/ai-draft/originals"
import { coderSkillFile } from "@/lib/architecture/skills-tree"

// Read-only: the full text of one real file behind a /ai-core node, for the detail panel
// to show the ACTUAL content (not a canned description). Never writes.
//  - kind=instruction → the agent's real instruction doc (CLAUDE.md / AGENTS.md / SOUL.md
//    …) via the shared allow-list in originals.ts (app root or /root/.hermes).
//  - kind=skill (default) → Hermes' flat skill *.md, or a coding platform's
//    <dotdir>/skills/<name>/SKILL.md.
// The name is reduced to a bare slug so no path can escape the allowed roots.
export async function GET(req: NextRequest) {
  if (!(await serviceApiGate(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const sp = req.nextUrl.searchParams
  const agent = (sp.get("agent") ?? "").trim()
  const name = (sp.get("name") ?? "").replace(/[^a-zA-Z0-9._-]/g, "")
  const kind = sp.get("kind") === "instruction" ? "instruction" : "skill"
  if (!agent || !name) {
    return NextResponse.json({ error: "agent and name are required" }, { status: 400 })
  }

  // Instruction docs: the shared resolver reads the real file the agent loads.
  if (kind === "instruction") {
    return NextResponse.json(await readOriginal(agent, "instruction", name))
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
