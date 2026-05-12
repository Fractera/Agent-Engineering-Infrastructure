import { NextRequest, NextResponse } from "next/server"

const DATA_URL    = process.env.REMOTE_DATA_URL ?? "http://localhost:3300"
const DATA_SECRET = process.env.DATA_API_KEY ?? ""
const IS_REMOTE   = !!process.env.REMOTE_DATA_URL

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const headers: Record<string, string> = {}
    if (DATA_SECRET) {
      headers["X-Data-Secret"] = DATA_SECRET
    } else {
      const cookie = req.headers.get("cookie") ?? ""
      if (cookie) headers["Cookie"] = cookie
    }

    const res = await fetch(`${DATA_URL}/media/upload`, {
      method: "POST",
      headers,
      body: formData,
    })

    const data = await res.json() as { ok: boolean; item?: { id: string; url: string } }

    // In remote/dev mode rewrite the URL to go through local proxy
    if (IS_REMOTE && data.ok && data.item) {
      data.item.url = `/api/media/${data.item.id}/file`
    }

    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
