import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth/get-session"

// Workspace glossary (step 107) — the term map every agent reads so abbreviations
// and voice-dictated phrasings are understood the same way (e.g. aws → ai-workspace).
// Global (one per workspace). The editable source; an agent can export/ingest it
// into glossary.md / Company Brain (ARCHITECTURE §3.11 Documentation corpus).

export async function GET() {
  const entries = await db.prepare(
    "SELECT id, term, meaning, created_at FROM glossary ORDER BY term COLLATE NOCASE ASC"
  ).all()
  return NextResponse.json({ entries })
}

export async function POST(req: NextRequest) {
  const { term, meaning } = await req.json()
  if (!term?.trim()) {
    return NextResponse.json({ error: "term is required" }, { status: 400 })
  }
  const session = await getSession(req)
  const createdBy = session?.email ?? req.headers.get("x-agent-identity") ?? "unknown"
  const id = crypto.randomUUID()
  await db.prepare(
    "INSERT INTO glossary (id, term, meaning, created_by) VALUES (?, ?, ?, ?)"
  ).run(id, String(term).trim(), meaning ? String(meaning).trim() : "", createdBy)
  const entry = await db.prepare("SELECT id, term, meaning, created_at FROM glossary WHERE id = ?").get(id)
  return NextResponse.json({ entry }, { status: 201 })
}
