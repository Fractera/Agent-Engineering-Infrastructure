import { NextRequest, NextResponse } from "next/server"

// Serve one file from a generated PWA/favicon icon set (favicon.ico, icon-192.png, ...).
// Proxies the Data/Media service GET /media/icons/:setId/file/:name, mirroring
// /api/media/[id]/file so the manifest and <head> icon links resolve through the app.
const DATA_URL    = process.env.REMOTE_DATA_URL ?? "http://localhost:3300"
const DATA_SECRET = process.env.DATA_API_KEY ?? ""

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ setId: string; name: string }> }
) {
  const { setId, name } = await params

  const headers: Record<string, string> = {}
  if (DATA_SECRET) {
    headers["X-Data-Secret"] = DATA_SECRET
  } else {
    const cookie = req.headers.get("cookie") ?? ""
    if (cookie) headers["Cookie"] = cookie
  }

  try {
    const res = await fetch(
      `${DATA_URL}/media/icons/${encodeURIComponent(setId)}/file/${encodeURIComponent(name)}`,
      { headers }
    )
    if (!res.ok) return new NextResponse(null, { status: res.status })

    const contentType = res.headers.get("content-type") ?? "application/octet-stream"
    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        // Icon sets can be regenerated under a new setId, so the URL changes on change —
        // a long cache is safe (mirrors the Data service's own icon cache window).
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch {
    return new NextResponse(null, { status: 502 })
  }
}
