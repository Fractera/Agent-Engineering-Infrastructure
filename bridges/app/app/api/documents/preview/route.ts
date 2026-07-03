import { NextRequest, NextResponse } from "next/server"
import { serviceApiGate } from "@/lib/service-auth"
import { readPreview } from "@/lib/crud-docs/fs"

// Read a document for Preview: .txt/.md as text, .docx extracted to text (mammoth),
// .doc reported as binary (download only). Read-only.
export async function GET(req: NextRequest) {
  if (!(await serviceApiGate(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const path = req.nextUrl.searchParams.get("path") ?? ""
  if (!path) return NextResponse.json({ kind: "missing" }, { status: 400 })
  const preview = await readPreview(path)
  return NextResponse.json(preview)
}
