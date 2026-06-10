import { NextRequest, NextResponse } from "next/server"
import { readRaw, writeRawStep, readStep } from "@/lib/dev-steps/step-file"

// Raw markdown of a step file — the "Source" view, mirroring the architecture
// Source tab. GET returns the file text. PUT overwrites it (NEW steps only; the
// file is the source of truth and new steps are directly editable). Completed
// steps are read-only → PUT refuses.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const raw = await readRaw(id)
  if (raw == null) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ raw })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cur = await readStep(id)
  if (!cur) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (cur.status !== "new") return NextResponse.json({ error: "Completed steps are read-only" }, { status: 409 })
  const { raw } = await req.json()
  if (typeof raw !== "string") return NextResponse.json({ error: "raw is required" }, { status: 400 })
  await writeRawStep(id, raw)
  return NextResponse.json({ ok: true })
}
