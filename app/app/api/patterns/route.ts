import { NextRequest, NextResponse } from "next/server"
import { createPattern } from "@/lib/patterns/pattern-file"
import type { PatternKind } from "@/lib/patterns/pattern-format"

// Declare a pattern / anti-pattern. POST { kind, name, category? } writes a new
// markdown file under PATTERNS/ (filesystem source of truth, no DB) with status
// "declared" — a request the model fills in later. You don't spell out how it looks;
// you name it, and an agent generates it. Same write path for the human UI and an
// agent. Mirrors the architecture declare flow (a requested route → orange + req).
export async function POST(req: NextRequest) {
  const { kind, name, category } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: "A name is required" }, { status: 400 })
  }
  const k: PatternKind = kind === "anti" ? "anti" : "pattern"
  const pattern = await createPattern(k, String(name).trim(), String(category ?? ""))
  return NextResponse.json({ pattern }, { status: 201 })
}
