import { NextRequest, NextResponse } from "next/server"

const DATA_URL    = process.env.REMOTE_DATA_URL ?? "http://localhost:3300"
const DATA_SECRET = process.env.DATA_API_KEY ?? ""

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const headers: Record<string, string> = {}
  if (DATA_SECRET) {
    headers["X-Data-Secret"] = DATA_SECRET
  } else {
    const cookie = req.headers.get("cookie") ?? ""
    if (cookie) headers["Cookie"] = cookie
  }

  try {
    const res = await fetch(`${DATA_URL}/media/${id}/file`, { headers })
    if (!res.ok) return new NextResponse(null, { status: res.status })

    const contentType = res.headers.get("content-type") ?? "application/octet-stream"
    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (e) {
    return new NextResponse(null, { status: 502 })
  }
}
