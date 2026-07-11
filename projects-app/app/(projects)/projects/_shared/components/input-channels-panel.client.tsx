"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { InputChannel } from "../channels";

// FROZEN STANDARD (step 220) — the Settings modal's "Input channels" body, driven ENTIRELY by the
// project's INPUT_CHANNELS declaration (_data/channels.ts). For each channel it shows the name, the
// one-line description, and every key with its `help` line (where to get it) + a masked input for
// secrets — no hard-coded hint lives here. A channel that declares an `oauth` handshake also gets a
// connect / disconnect row and the redirect URI to register. Saving a key writes the projects-app env
// (runtime var + restart, the same path the bot token/OpenAI key always used).
type OAuthStatus = { configured: boolean; connected: boolean };

async function saveKey(env: string, value: string, setter?: "env" | "openai-key"): Promise<boolean> {
  // The ONE global OpenAI key uses its own propagating setter (step 208/220); everything else is a
  // slot runtime env write. Which one is DECLARED per key in _data/channels.ts, not decided here.
  const r =
    setter === "openai-key"
      ? await fetch("/api/project-config/openai-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: value.trim() }),
        })
      : await fetch("/api/project-config/env", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: env, value: value.trim() }),
        });
  if (!r.ok) {
    const info = (await r.json().catch(() => null)) as { error?: string } | null;
    toast.error(info?.error ?? `Save failed (HTTP ${r.status})`);
    return false;
  }
  return true;
}

function ChannelKeyRow({
  env, label, help, secret, setter, present, onSaved,
}: {
  env: string; label: string; help?: string; secret?: boolean; setter?: "env" | "openai-key"; present: boolean;
  onSaved: (env: string, value: string) => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!value.trim()) return;
    setBusy(true);
    try {
      if (await saveKey(env, value, setter)) {
        onSaved(env, value.trim());
        setValue("");
        toast.success(`${label} saved — applying (a brief restart).`);
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">{label}</label>
        {present && <span className="text-xs text-emerald-600 dark:text-emerald-400">configured</span>}
      </div>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      <div className="flex gap-2">
        <Input
          type={secret ? "password" : "text"}
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={present ? "replace…" : "enter value…"}
        />
        <Button onClick={save} disabled={busy || !value.trim()}>Save</Button>
      </div>
    </div>
  );
}

function OAuthRow({ oauth }: { oauth: NonNullable<InputChannel["oauth"]> }) {
  const [status, setStatus] = useState<OAuthStatus | null>(null);
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setOrigin(window.location.origin);
    fetch(oauth.statusPath, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStatus(d as OAuthStatus))
      .catch(() => {});
  }, [oauth.statusPath]);
  async function disconnect() {
    setBusy(true);
    try {
      const r = await fetch(oauth.disconnectPath, { method: "POST" });
      if (r.ok) { setStatus((s) => ({ configured: s?.configured ?? true, connected: false })); toast.success("Disconnected"); }
      else toast.error(`Disconnect failed (HTTP ${r.status})`);
    } finally { setBusy(false); }
  }
  const configured = status?.configured ?? false;
  const connected = status?.connected ?? false;
  return (
    <div className="space-y-2">
      {origin && (
        <div className="space-y-1">
          <p className="text-xs font-medium">Redirect URI to register</p>
          <code className="block overflow-x-auto rounded-md border bg-muted/40 px-2 py-1 text-xs">{origin}{oauth.callbackPath}</code>
        </div>
      )}
      <div className="flex items-center justify-between rounded-md border p-3">
        <p className="text-sm">{!configured ? "Not configured" : connected ? "Connected" : "Not connected"}</p>
        {connected ? (
          <Button variant="outline" size="sm" disabled={busy} onClick={disconnect}>Disconnect</Button>
        ) : configured ? (
          <a href={oauth.connectPath} className={cn(buttonVariants({ size: "sm" }))}>Connect</a>
        ) : (
          <Button size="sm" disabled>Connect</Button>
        )}
      </div>
    </div>
  );
}

export function InputChannelsPanel({
  channels, onKeySaved,
}: {
  channels: InputChannel[];
  onKeySaved?: (env: string, value: string) => void;
}) {
  const [present, setPresent] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const keys = channels.flatMap((c) => c.keys.map((k) => k.env));
    if (!keys.length) return;
    fetch(`/api/project-config/env?keys=${keys.join(",")}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { present?: Record<string, boolean> } | null) => d?.present && setPresent(d.present))
      .catch(() => {});
  }, [channels]);

  if (!channels.length) {
    return <p className="text-sm text-muted-foreground">No input channels declared yet.</p>;
  }
  return (
    <div className="space-y-5">
      {channels.map((c) => (
        <div key={c.name} className="space-y-3 rounded-lg border p-3">
          <div>
            <p className="text-sm font-semibold">{c.name}</p>
            <p className="text-xs text-muted-foreground">{c.description}</p>
          </div>
          {c.keys.map((k) => (
            <ChannelKeyRow
              key={k.env}
              env={k.env}
              label={k.label}
              help={k.help}
              secret={k.secret}
              setter={k.setter}
              present={Boolean(present[k.env])}
              onSaved={(env, v) => onKeySaved?.(env, v)}
            />
          ))}
          {c.oauth && <OAuthRow oauth={c.oauth} />}
        </div>
      ))}
    </div>
  );
}
