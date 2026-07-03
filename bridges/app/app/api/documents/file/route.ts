import { NextRequest, NextResponse } from "next/server"
import { serviceApiGate } from "@/lib/service-auth"
import { readBuffer } from "@/lib/crud-docs/fs"

// Download a document as-is (used for .doc and any file the user wants to save). GET
// ?path=<rel>. Read-only; streams the raw bytes back as an attachment.
export async function GET(req: NextRequest) {
  if (!(await serviceApiGate(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const path = req.nextUrl.searchParams.get("path") ?? ""
  const hit = await readBuffer(path)
  if (!hit) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return new NextResponse(new Uint8Array(hit.buf), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(hit.name)}"`,
    },
  })
}
