import { db } from "@/lib/db";

// Google Calendar connector (step 207 Phase F) — self-sufficient OAuth 2.0 + event push for the
// telegram-notes automation. Shared by the OAuth routes (../calendar/*) and the workflow's persist
// step (../_workflow/definition.ts). Inert without credentials/token: every function returns
// null/false so a project with no Google creds keeps working exactly as before (self-sufficiency).
// One global path: creds live in the slot's own .env.local (runtime vars, rule 143), the per-project
// token in automation_calendar_tokens. NO Hermes dependency.

export const PROJECT = "telegram-notes";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
// calendar.events (write events) — narrower than full `calendar`.
const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const CALLBACK_PATH = "/api/projects/personal/telegram-notes/calendar/callback";
const DEFAULT_EVENT_MINUTES = 30; // an event with no explicit end lasts 30 min
const MAX_OVERRIDE_MINUTES = 40320; // Google caps a reminder override at 4 weeks

type Creds = { clientId: string; clientSecret: string };
type TokenRow = {
  project: string;
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
  expiry: number | null;
  created_at: number;
};

// Env creds (runtime, slot .env.local). Absent → the connector is "not configured" everywhere.
export function calendarCreds(): Creds | null {
  const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID ?? "").trim();
  const clientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "").trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

// Build the exact redirect URI from the request origin so it matches what the owner registers in Google.
export function redirectUri(origin: string): string {
  return `${origin.replace(/\/+$/, "")}${CALLBACK_PATH}`;
}

export function buildConsentUrl(clientId: string, redirect: string): string {
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline", // ask for a refresh_token
    prompt: "consent", // force a refresh_token even on re-consent
    include_granted_scopes: "true",
  });
  return `${AUTH_URL}?${p.toString()}`;
}

// ── Token storage (automation_calendar_tokens, one row per project) ──
export async function getToken(project = PROJECT): Promise<TokenRow | null> {
  try {
    const row = (await db
      .prepare(
        "SELECT project, provider, access_token, refresh_token, expiry, created_at " +
          "FROM automation_calendar_tokens WHERE project = ?",
      )
      .get(project)) as TokenRow | null;
    return row ?? null;
  } catch {
    return null; // table not present yet / storage unavailable → treated as "not connected"
  }
}

export async function hasToken(project = PROJECT): Promise<boolean> {
  const t = await getToken(project);
  return Boolean(t && (t.refresh_token || t.access_token));
}

export async function saveToken(t: {
  project?: string;
  accessToken: string;
  refreshToken: string;
  expiry: number;
}): Promise<void> {
  const project = t.project ?? PROJECT;
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      "INSERT OR REPLACE INTO automation_calendar_tokens " +
        "(project, provider, access_token, refresh_token, expiry, created_at) " +
        "VALUES (?, 'google', ?, ?, ?, ?)",
    )
    .run(project, t.accessToken, t.refreshToken, t.expiry, now);
}

export async function deleteToken(project = PROJECT): Promise<void> {
  try {
    await db.prepare("DELETE FROM automation_calendar_tokens WHERE project = ?").run(project);
  } catch {
    /* best-effort */
  }
}

// ── OAuth token endpoint ──
export async function exchangeCode(
  code: string,
  redirect: string,
): Promise<{ accessToken: string; refreshToken: string; expiry: number } | null> {
  const creds = calendarCreds();
  if (!creds) return null;
  try {
    const body = new URLSearchParams({
      code,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri: redirect,
      grant_type: "authorization_code",
    });
    const r = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return null;
    const d = (await r.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!d.access_token) return null;
    const expiry = Math.floor(Date.now() / 1000) + (Number(d.expires_in) || 3600);
    return { accessToken: d.access_token, refreshToken: d.refresh_token ?? "", expiry };
  } catch {
    return null;
  }
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiry: number } | null> {
  const creds = calendarCreds();
  if (!creds || !refreshToken) return null;
  try {
    const body = new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
    const r = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return null;
    const d = (await r.json()) as { access_token?: string; expires_in?: number };
    if (!d.access_token) return null;
    return { accessToken: d.access_token, expiry: Math.floor(Date.now() / 1000) + (Number(d.expires_in) || 3600) };
  } catch {
    return null;
  }
}

// Return a currently-valid access token, refreshing (and persisting the new one) when expired.
async function validAccessToken(project = PROJECT): Promise<string | null> {
  const t = await getToken(project);
  if (!t) return null;
  const now = Math.floor(Date.now() / 1000);
  if (t.access_token && t.expiry && t.expiry > now + 60) return t.access_token;
  if (!t.refresh_token) return t.access_token && t.expiry && t.expiry > now ? t.access_token : null;
  const refreshed = await refreshAccessToken(t.refresh_token);
  if (!refreshed) return null;
  try {
    await db
      .prepare("UPDATE automation_calendar_tokens SET access_token = ?, expiry = ? WHERE project = ?")
      .run(refreshed.accessToken, refreshed.expiry, project);
  } catch {
    /* best-effort — the token still works this run */
  }
  return refreshed.accessToken;
}

// Compute the popup reminder lead time (minutes before the event), clamped to Google's bounds. Exported
// for offline unit testing (pure).
export function overrideMinutes(eventAt: number, reminderDue: number | null): number {
  if (reminderDue == null) return 0;
  const m = Math.round((eventAt - reminderDue) / 60);
  return Math.min(MAX_OVERRIDE_MINUTES, Math.max(0, m));
}

// Best-effort: create a Google Calendar event mirroring one reminder. Returns the external event id, or
// null when inert (no creds / not connected / any error). NEVER throws — the caller's reminder is already
// saved regardless (step 207 Phase F contract).
export async function pushCalendarEvent(opts: {
  project?: string;
  eventAt: number;
  reminderDue: number | null;
  summary: string;
  description?: string;
}): Promise<string | null> {
  const project = opts.project ?? PROJECT;
  if (!calendarCreds()) return null; // inert without creds
  const token = await validAccessToken(project);
  if (!token) return null; // not connected
  try {
    const startISO = new Date(opts.eventAt * 1000).toISOString();
    const endISO = new Date((opts.eventAt + DEFAULT_EVENT_MINUTES * 60) * 1000).toISOString();
    const overrides = [{ method: "popup", minutes: overrideMinutes(opts.eventAt, opts.reminderDue) }];
    const event = {
      summary: (opts.summary || "Reminder").slice(0, 500),
      description: (opts.description ?? "").slice(0, 4000),
      start: { dateTime: startISO },
      end: { dateTime: endISO },
      reminders: { useDefault: false, overrides },
    };
    const r = await fetch(EVENTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return null;
    const d = (await r.json()) as { id?: string };
    return d.id ?? null;
  } catch {
    return null;
  }
}
