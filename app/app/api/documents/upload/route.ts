import { NextRequest, NextResponse } from "next/server"
import { saveUpload } from "@/lib/crud-docs/fs"

// Upload a real document into a folder under CRUD-DOCS/. multipart/form-data: `parent`
// (target folder rel path, "" = root) + `file`. Only .txt/.md/.doc/.docx are accepted;
// the file is written to disk as a real document (no staging).
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const parent = String(form.get("parent") ?? "")
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }
  const buf = Buffer.from(await file.arrayBuffer())
  const res = await saveUpload(parent, file.name, buf)
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ rel: res.rel }, { status: 201 })
}
