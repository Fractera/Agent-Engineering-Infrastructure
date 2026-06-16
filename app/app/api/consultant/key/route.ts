import { NextRequest, NextResponse } from 'next/server'
import { resolveTier } from '@/lib/consultant/tier'
import { publicKeyConfigured, setPublicKey } from '@/lib/consultant/public-key'

// Public consultant API-key surface (R7). The public page (anonymous) may SET the key when
// none exists yet (set-if-empty); the owner may REPLACE it. The consent notice
// ("this key is saved on the server and used in the project") is shown by the client block
// before submit. Node runtime: filesystem + hermes CLI.
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ configured: publicKeyConfigured() })
}

export async function POST(req: NextRequest) {
  let body: { apiKey?: unknown } = {}
  try { body = await req.json() } catch { /* empty */ }
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey : ''
  if (!apiKey.trim()) return NextResponse.json({ error: 'apiKey is required' }, { status: 400 })

  // Owner may replace an existing key; anyone may set the first key (set-if-empty).
  const { tier } = await resolveTier(req)
  const allowReplace = tier === 'owner'

  const r = setPublicKey(apiKey, allowReplace)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
  return NextResponse.json({ ok: true })
}
