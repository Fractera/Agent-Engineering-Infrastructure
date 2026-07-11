import { NextRequest, NextResponse } from "next/server"
import { spawn } from "node:child_process"
import { getSession } from "@/lib/auth/get-session"
import { createFrozenProject } from "@/app/(projects)/projects/_lib/frozen-project-starter"

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

// Detached rebuild + reload so the freshly materialized route is served. The parent keeps
// serving until pm2 reload swaps in the new .next — same shape as a normal projects deploy.
function rebuildAndReload(): void {
  try {
    spawn("sh", ["-c", "cd /opt/fractera/projects-app && npm run build && pm2 reload fractera-projects"], {
      detached: true,
      stdio: "ignore",
    }).unref()
  } catch { /* best-effort — the files are written regardless */ }
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  let body: { category?: string; project?: string; title?: string; description?: string; force?: boolean }
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
    force: !!body.force,
  })

  if (!result.ok) return NextResponse.json(result, { status: 400 })

  rebuildAndReload()
  return NextResponse.json({
    ...result,
    building: true,
    message: `Created ${result.category}/${result.project}. Rebuilding projects-app (~1-2 min) — then open ${result.url}.`,
  })
}
