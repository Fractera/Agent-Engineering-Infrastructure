import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/get-session"
import { createV2Automation } from "@/app/(projects)/projects/_lib/v2-birth"
import { scheduleRebuild } from "@/lib/nodes"

// The "создать автоматизацию" endpoint (step 214, rewired to v2 birth in step 301). ONE function —
// createV2Automation — serves both the owner's form (a fetch from create-automation-card) and a future
// AI-driven call: same code path, never two. It CLONES the frozen v2 stream starter
// (_lib/starters/stream/en) into a new category folder, gives the clone a fresh passport.uuid + the
// owner's title + empty use-cases (the description is written afterwards in the use-cases Quiz), leaving
// it frozen with every node hidden — the newborn shows an empty canvas and invites the owner to describe
// its use-cases. Then a detached rebuild brings the new page up on its own.
//
// Terminal (owner, IP mode bypasses auth; secure mode needs an architect/manager session):
//   curl -X POST http://<ip>:3003/api/projects/create \
//        -H "Content-Type: application/json" \
//        -d '{"category":"personal","project":"telegram-dietolog","title":"Telegram диетолог"}'
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

  let body: { category?: string; project?: string; title?: string; force?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }

  // Step 301: only the STREAM v2 starter exists, so type is not chosen at birth (per-type v2 starters and
  // the description now live AFTER birth — the description is authored in the use-cases Quiz). The author is
  // the creating user when a session is present (secure mode), else the onboarding architect (IP mode).
  const session = IP_MODE ? null : await getSession(req)
  const author = session?.userId ? String(session.userId) : "architect"

  const result = await createV2Automation({
    category: String(body.category ?? ""),
    project: String(body.project ?? ""),
    title: body.title ? String(body.title) : undefined,
    author,
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
