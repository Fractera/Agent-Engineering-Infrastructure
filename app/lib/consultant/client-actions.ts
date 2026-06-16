// Shared client-action contract for the public consultant (step "Интерактивный
// консультант"). Mirror of the mcp-access-manifest.json entries with
// execution:"client" (MCP-REGISTRY §12). PURE — no app/runtime deps — so both the
// server extraction (/api/consultant) and the browser registry import the SAME
// allowlist + validation. The browser NEVER executes a name absent from here.
//
// A client-action is a per-visitor VIEW action the consultant PROPOSES and the
// BROWSER executes (navigate / locale / theme / width). It never touches shared
// server state. The MCP tool's result is the deferred envelope below; /api/consultant
// turns it into a ClientAction button; a click runs the matching browser handler.

export type ClientActionName =
  | 'public_view_navigate_page'
  | 'public_view_set_locale'
  | 'public_view_set_theme'
  | 'public_view_set_width'

export const CLIENT_ACTION_NAMES: ClientActionName[] = [
  'public_view_navigate_page',
  'public_view_set_locale',
  'public_view_set_theme',
  'public_view_set_width',
]

// The deferred-execution envelope client-actions-mcp-server.js returns as a tool result.
export type ClientActionEnvelope = { __client_action__: true; tool: string; args?: Record<string, unknown> }

// One proposed action the browser renders as a clickable button.
export type ClientAction = {
  id: string
  tool: ClientActionName
  args: Record<string, unknown>
  label: string
}

export function isClientActionName(name: unknown): name is ClientActionName {
  return typeof name === 'string' && (CLIENT_ACTION_NAMES as string[]).includes(name)
}

// Tolerant parse of a tool-result payload (the content text of a `tool.complete`
// event) into our envelope. Returns null for anything that is not our envelope.
export function parseClientActionEnvelope(resultText: string): ClientActionEnvelope | null {
  try {
    const j = JSON.parse(resultText)
    if (j && j.__client_action__ === true && typeof j.tool === 'string') {
      return { __client_action__: true, tool: j.tool, args: j.args && typeof j.args === 'object' ? j.args : {} }
    }
  } catch {
    /* not JSON / not our envelope */
  }
  return null
}

export type ArgCheck = { ok: true; args: Record<string, unknown> } | { ok: false; error: string }

const THEME_MODES = ['light', 'dark', 'system']
const WIDTHS = ['narrow', 'wide']

// Static-shape validation shared by server and browser. Dynamic checks that need live
// config (locale ∈ configured languages, route ∈ existing pages) are layered ON TOP in
// the browser registry where that config is available — this is the universal guard.
export function validateActionArgs(tool: ClientActionName, args: Record<string, unknown>): ArgCheck {
  const a = args ?? {}
  switch (tool) {
    case 'public_view_navigate_page': {
      const to = typeof a.to === 'string' ? a.to.trim() : ''
      if (!to.startsWith('/')) return { ok: false, error: 'navigate: "to" must be a site path starting with "/"' }
      return { ok: true, args: { to } }
    }
    case 'public_view_set_locale': {
      const locale = typeof a.locale === 'string' ? a.locale.trim().toLowerCase() : ''
      if (!locale) return { ok: false, error: 'set_locale: "locale" is required' }
      return { ok: true, args: { locale } }
    }
    case 'public_view_set_theme': {
      const mode = typeof a.mode === 'string' ? a.mode.trim().toLowerCase() : ''
      if (!THEME_MODES.includes(mode)) return { ok: false, error: 'set_theme: "mode" must be light|dark|system' }
      return { ok: true, args: { mode } }
    }
    case 'public_view_set_width': {
      const width = typeof a.width === 'string' ? a.width.trim().toLowerCase() : ''
      if (!WIDTHS.includes(width)) return { ok: false, error: 'set_width: "width" must be narrow|wide' }
      return { ok: true, args: { width } }
    }
    default:
      return { ok: false, error: `unknown client-action: ${tool}` }
  }
}

// Default button label derived from tool + args (the agent's surrounding text carries
// the explanation; the button is short). /api/consultant uses this when forwarding.
export function defaultActionLabel(tool: ClientActionName, args: Record<string, unknown>): string {
  switch (tool) {
    case 'public_view_navigate_page':
      return `Open ${String(args.to ?? '')}`.trim()
    case 'public_view_set_locale':
      return String(args.locale ?? '').toUpperCase()
    case 'public_view_set_theme':
      return `Theme: ${String(args.mode ?? '')}`
    case 'public_view_set_width':
      return `Width: ${String(args.width ?? '')}`
    default:
      return tool
  }
}
