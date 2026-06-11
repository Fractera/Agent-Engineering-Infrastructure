import { NextRequest, NextResponse } from "next/server"
import { createFolder } from "@/lib/crud-docs/fs"

// Create a real folder under CRUD-DOCS/. POST { parent, name } — the name is validated
// for the filesystem (createFolder); on success the directory exists on disk.
export async function POST(req: NextRequest) {
  const { parent, name } = await req.json()
  const res = await createFolder(String(parent ?? ""), String(name ?? ""))
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ rel: res.rel }, { status: 201 })
}
