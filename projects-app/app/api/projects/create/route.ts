import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/get-session"
import { createFrozenProject } from "@/app/(projects)/projects/_lib/frozen-project-starter"
import { scheduleRebuild } from "@/lib/nodes"

// The "запусти проект автоматизации" endpoint (step 214). ONE function — createFrozenProject —
// serves both the owner's terminal command (a curl to this route) and a future AI-driven call:
// same code path, never two. It materializes the frozen automation skeleton (v1: header + footer
// from the zone layout + a centered "coming soon") into projects-app, then spawns a detached
// rebuild + reload so the new page comes up on its own — one command → the white screen.
//
// Terminal (owner, IP mode bypasses auth; secure mode needs an architect/manager session):
//   curl -X POST http://<ip>:3003/api/projects/create \
//        -H "Content-Type: application/json" \
//        -d '{"category":"personal","project":"youtube","title":"YouTube"}'
export const runtime = "nodejs"

const WRITE_ROLES = ["architect", "manager", "agent"]
const IP_MODE = process.env.FRACTERA_IP_NODOMAIN_MODE === "true"

async function authorize(req: NextRequest): Promise<boolean> {
  if (IP_MODE) return true // onboarding surface — open, like the other project-config routes
  const session = await getSession(req)
  return Boolean(session?.roles?.some((r) => WRITE_ROLES.includes(r)))
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  let body: {
    category?: string; project?: string; title?: string; description?: string; force?: boolean
    type?: string; instruction?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }

  const result = await createFrozenProject({
    category: String(body.category ?? ""),
    project: String(body.project ?? ""),
    title: body.title ? String(body.title) : undefined,
    description: body.description ? String(body.description) : undefined,
    // Phase 1 (step 224 §1.5): the immutable automation type + the owner's mandatory instruction. "chained"
    // (step 234, made real in 234.3) is stored as-is now — it renders as a group container on the global
    // canvas (_shared/components/global-canvas.client.tsx), the frozen skeleton is unchanged.
    type: body.type === "instanced" ? "instanced" : body.type === "chained" ? "chained" : "stream",
    instruction: body.instruction ? String(body.instruction) : undefined,
    force: !!body.force,
  })

  if (!result.ok) return NextResponse.json(result, { status: 400 })

  // Same locked rebuild path as POST /api/projects/categories (lib/nodes.ts scheduleRebuild(), flock at
  // /tmp/projects-build.lock) — unified 2026-07-14 so an automation created right after its category can
  // no longer race a second, unlocked `npm run build` and corrupt .next (this route used to spawn its own
  // unlocked build+reload here).
  scheduleRebuild()
  return NextResponse.json({
    ...result,
    building: true,
    message: `Created ${result.category}/${result.project}. Rebuilding projects-app (~1-2 min) — then open ${result.url}.`,
  })
}
