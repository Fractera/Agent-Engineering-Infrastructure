import { NextRequest, NextResponse } from "next/server"
import { readGlossary, writeGlossary } from "@/lib/glossary-file"

// Workspace glossary (step 107) — backed by a REAL file GLOSSARY.md at the
// project root, so any agent reads it directly as context. GET lists, POST adds
// a row, DELETE ?index=N removes a row; every change rewrites the file.

export async function GET() {
  const entries = await readGlossary()
  return NextResponse.json({ entries })
}

export async function POST(req: NextRequest) {
  const { term, meaning } = await req.json()
  if (!term?.trim()) {
    return NextResponse.json({ error: "term is required" }, { status: 400 })
  }
  const entries = await readGlossary()
  entries.push({ term: String(term).trim(), meaning: String(meaning ?? "").trim() })
  await writeGlossary(entries)
  return NextResponse.json({ entries }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const idx = Number(new URL(req.url).searchParams.get("index"))
  if (!Number.isInteger(idx)) {
    return NextResponse.json({ error: "index is required" }, { status: 400 })
  }
  const entries = await readGlossary()
  if (idx >= 0 && idx < entries.length) entries.splice(idx, 1)
  await writeGlossary(entries)
  return NextResponse.json({ entries })
}
