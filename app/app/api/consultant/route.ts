import { NextRequest, NextResponse } from 'next/server'
import { resolveTier } from '@/lib/consultant/tier'
import type { ClientAction } from '@/lib/consultant/client-actions'

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
  // R6: the agent recognised an owner/user intent the caller isn't authorised for.
  authRequired?: { reason: string; link: string }
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
  return NextResponse.json({ available, tier })
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

  // ── WS adapter SEAM (Phase C transport — pinned empirically, NOT guessed) ──────────
  // TODO(C1): connect to PUBLIC_HERMES_URL over its WebSocket (POST /api/auth/ws-ticket
  // → WS), send `message` in session `sessionId`, and consume the streamed gateway
  // events: accumulate assistant text from `message.delta`, and from every
  // `tool.complete` whose result is a __client_action__ envelope build a ClientAction via
  //   parseClientActionEnvelope() + validateActionArgs() + defaultActionLabel()
  // (all in lib/consultant/client-actions.ts — already implemented). Map a missing/invalid
  // key or quota error to { keyError: true } (E3), and an owner/user-only intent from a
  // lower tier to { authRequired } (R6). Until the transport is pinned this returns an
  // honest "not connected yet" turn so the widget renders end-to-end without faking a reply.
  const turn: ConsultantTurn = {
    sessionId,
    text:
      'The consultant is not connected to the agent yet (the chat transport is being ' +
      'finalised). Once connected, ask about the site or request an action — answers may ' +
      'include buttons you can click.',
    actions: [],
  }
  // tier is resolved and ready for R6/scoping once the transport is wired.
  void tier
  return NextResponse.json(turn)
}
