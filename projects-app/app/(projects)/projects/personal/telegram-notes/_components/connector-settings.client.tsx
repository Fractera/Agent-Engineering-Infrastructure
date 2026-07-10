"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Connectors tab (step 207 Phase F, 207.12): connect this automation's reminders to an external Google
// Calendar. The owner pastes their Google OAuth client id/secret (saved as runtime slot env vars, same path
// as the bot token — rule 143), then authorizes access. Fully inert without creds (self-sufficiency): the
// tab shows "not configured" and the button stays disabled. Status comes from the calendar/status route.
const CONNECT_URL = "/api/projects/personal/telegram-notes/calendar/connect";
const DISCONNECT_URL = "/api/projects/personal/telegram-notes/calendar/disconnect";
const STATUS_URL = "/api/projects/personal/telegram-notes/calendar/status";
const CALLBACK_PATH = "/api/projects/personal/telegram-notes/calendar/callback";

type Status = { configured: boolean; connected: boolean };

async function saveEnv(key: string, value: string, label: string): Promise<boolean> {
  const r = await fetch("/api/project-config/env", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: value.trim() }),
  });
  if (!r.ok) {
    const info = (await r.json().catch(() => null)) as { error?: string } | null;
    toast.error(info?.error ?? `${label} save failed (HTTP ${r.status})`);
    return false;
  }
  return true;
}

export function ConnectorSettings() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    void (async () => {
      try {
        const r = await fetch(STATUS_URL, { cache: "no-store" });
        if (r.ok) setStatus((await r.json()) as Status);
      } catch {
        /* leave unknown */
      }
    })();
  }, []);

  async function saveCreds() {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error("Enter both the client ID and client secret.");
      return;
    }
    setBusy(true);
    try {
      if (!(await saveEnv("GOOGLE_OAUTH_CLIENT_ID", clientId, "Client ID"))) return;
      if (!(await saveEnv("GOOGLE_OAUTH_CLIENT_SECRET", clientSecret, "Client secret"))) return;
      setClientId("");
      setClientSecret("");
      setStatus((s) => ({ configured: true, connected: s?.connected ?? false }));
      toast.success("Credentials saved — applying (a brief restart). Then press Connect.");
    } catch {
      toast.error("Could not save the credentials (network error)");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      const r = await fetch(DISCONNECT_URL, { method: "POST" });
      if (r.ok) {
        setStatus((s) => ({ configured: s?.configured ?? true, connected: false }));
        toast.success("Disconnected from Google Calendar");
      } else toast.error(`Disconnect failed (HTTP ${r.status})`);
    } catch {
      toast.error("Could not disconnect (network error)");
    } finally {
      setBusy(false);
    }
  }

  const configured = status?.configured ?? false;
  const connected = status?.connected ?? false;
  const statusLabel = !configured
    ? "Calendar connector not configured"
    : connected
      ? "Connected"
      : "Not connected";
  const statusHint = !configured
    ? "Add your Google OAuth credentials below to enable it."
    : connected
      ? "New reminders are mirrored to your Google Calendar as events."
      : "Authorize access so reminders push as calendar events.";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Mirror this automation&apos;s reminders into your Google Calendar. In the{" "}
        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">
          Google Cloud console
        </a>{" "}
        create an OAuth 2.0 <strong>Web application</strong> client, add the redirect URI below to its
        &ldquo;Authorized redirect URIs&rdquo;, then paste the client ID and secret here.
      </p>

      {origin ? (
        <div className="space-y-1">
          <p className="text-xs font-medium">Redirect URI to register</p>
          <code className="block overflow-x-auto rounded-md border bg-muted/40 px-2 py-1 text-xs">
            {origin}
            {CALLBACK_PATH}
          </code>
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="g-client-id" className="text-sm font-medium">
          Google OAuth client ID
        </label>
        <Input
          id="g-client-id"
          autoComplete="off"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="…apps.googleusercontent.com"
        />
        <label htmlFor="g-client-secret" className="text-sm font-medium">
          Google OAuth client secret
        </label>
        <Input
          id="g-client-secret"
          type="password"
          autoComplete="off"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          placeholder="GOCSPX-…"
        />
        <Button onClick={saveCreds} disabled={busy || !clientId.trim() || !clientSecret.trim()}>
          Save credentials
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">{statusLabel}</p>
          <p className="text-xs text-muted-foreground">{statusHint}</p>
        </div>
        {connected ? (
          <Button variant="outline" size="sm" disabled={busy} onClick={disconnect}>
            Disconnect
          </Button>
        ) : configured ? (
          <a href={CONNECT_URL} className={cn(buttonVariants({ size: "sm" }))}>
            Connect Google Calendar
          </a>
        ) : (
          <Button size="sm" disabled>
            Connect Google Calendar
          </Button>
        )}
      </div>
    </div>
  );
}
