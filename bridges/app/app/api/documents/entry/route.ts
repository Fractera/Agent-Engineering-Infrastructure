import { NextRequest, NextResponse } from "next/server"
import { serviceApiGate } from "@/lib/service-auth"
import { deleteEntry } from "@/lib/crud-docs/fs"

// Delete a real folder (recursively) or file under CRUD-DOCS/. DELETE ?path=<rel>.
// This is a real, irreversible filesystem delete — the UI guards it with a modal.
export async function DELETE(req: NextRequest) {
  if (!(await serviceApiGate(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const path = req.nextUrl.searchParams.get("path") ?? ""
  const ok = await deleteEntry(path)
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 })
}
