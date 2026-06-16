import { NextRequest, NextResponse } from 'next/server'
import { resolveTier } from '@/lib/consultant/tier'
import { runConsultantTurn } from '@/lib/consultant/hermes-ws'
import { publicKeyConfigured } from '@/lib/consultant/public-key'
import { getPlatformConfig } from '@/config/platform-config'
import type { ClientAction } from '@/lib/consultant/client-actions'

// Node runtime: the WS transport (undici WebSocket) + loopback fetch need Node, not edge.
export const runtime = 'nodejs'

// ── /api/consultant — server bridge for the public consultant widget ────────────────
// The widget (floating button → modal chat) talks ONLY to this route; this route talks
// to the public Hermes process (loopback :9129, tier ceiling=user) — holding the Hermes
// token server-side so a visitor never sees it. Tier is resolved here from the session
// (never trusted from the client). See next-step "Интерактивный консультант".
//
// STABLE contract (decoupled from Hermes' private WS internals, which are pinned
// empirically — see step C1 finding):
//   GET  → { available: boolean, tier }              gate for the floating button
//   POST { message, sessionId? } → ConsultantTurn    one consultant turn

const PUBLIC_HERMES_URL = process.env.PUBLIC_HERMES_URL ?? 'http://127.0.0.1:9129'

export type ConsultantTurn = {
  sessionId: string | null
  text: string
  actions: ClientAction[]
  // R6: the agent predetermined that the request needs authentication — kind 'personal'
  // (their own data → sign in as themselves) or 'role' (capability not in their role). The
  // widget renders the matching localized message + a sign-in button (link built client-side).
  authRequired?: { kind: 'personal' | 'role' }
  // Surfaced by the error component (E3): the public process has no/invalid key or quota.
  keyError?: boolean
}

// GET — is the public consultant available? (public Hermes reachable). The floating
// button renders only when this is true (R2).
export async function GET(req: NextRequest) {
  const { tier } = await resolveTier(req)
  let available = false
  try {
    const res = await fetch(`${PUBLIC_HERMES_URL}/`, { signal: AbortSignal.timeout(2000) })
    available = res.ok
  } catch {
    available = false
  }
  // parallelRouting tells the browser whether width changes apply (the width action only has
  // a consumer — MainScrollArea — in the slot layout; in flat mode it is a no-op, so the
  // runner refuses it). See next-step decision "width = B".
  const parallelRouting = !!getPlatformConfig().parallelRouting
  return NextResponse.json({ available, tier, keyConfigured: publicKeyConfigured(), parallelRouting })
}

// POST — one consultant turn.
export async function POST(req: NextRequest) {
  const { tier } = await resolveTier(req)
  let body: { message?: unknown; sessionId?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    /* empty body */
  }
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : null
  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })

  // Transport (C1) — contract pinned from source; lib/consultant/hermes-ws.ts speaks the
  // /api/ws JSON-RPC protocol (session.create + prompt.submit; message.delta + tool.complete
  // → __client_action__ envelopes become actions[]). Gated on the dashboard token being
  // configured: Phase B sets HERMES_DASHBOARD_SESSION_TOKEN on the public process and exposes
  // it here as PUBLIC_HERMES_TOKEN. Until then, an honest "not connected" turn (no faked reply).
  const token = process.env.PUBLIC_HERMES_TOKEN ?? process.env.HERMES_MCP_SECRET ?? ''
  if (!token) {
    return NextResponse.json({
      sessionId,
      text: 'The consultant is not connected to the agent yet (chat transport not configured).',
      actions: [],
    } satisfies ConsultantTurn)
  }

  try {
    const t = await runConsultantTurn({ url: PUBLIC_HERMES_URL, token, message, sessionId })
    void tier // reserved for R6 (ask-to-authorize on owner intent) + data scoping once wired
    return NextResponse.json({
      sessionId: t.sessionId,
      text: t.text || (t.keyError ? '' : 'Sorry — I could not produce a reply.'),
      actions: t.actions,
      keyError: t.keyError,
      authRequired: t.authRequired,
    } satisfies ConsultantTurn)
  } catch {
    return NextResponse.json({
      sessionId,
      text: 'Sorry — the consultant is unavailable right now. Please try again.',
      actions: [],
    } satisfies ConsultantTurn)
  }
}
