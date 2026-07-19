"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// FROZEN STANDARD (step 220) — the "AI model" settings section, generic over any automation.
// ONE global OpenAI key (step 208: written with the propagating openai-key setter, applies to EVERY
// automation) + this automation's OWN model, picked from the LIVE /api/openai-models dropdown and saved
// to its own runtime env key (modelEnvKey). The manual input is only the graceful fallback when the live
// list is unavailable (no key yet / OpenAI down).
// `tools` (step 250): the develop agent needs tool calling — models without it are hidden from the picker.
// Optional so a stale cached payload (no `tools` field) keeps showing everything (backward compatible).
type LiveModel = { id: string; family: string; recommended: boolean; tools?: boolean };

export function ModelKeySettings({
  modelEnvKey,
  defaultModel,
}: {
  modelEnvKey: string;
  defaultModel: string;
}) {
  const [apiKey, setApiKey] = useState("");
  const [keyBusy, setKeyBusy] = useState(false);
  const [model, setModel] = useState("");
  const [current, setCurrent] = useState("");
  const [modelBusy, setModelBusy] = useState(false);
  const [live, setLive] = useState<LiveModel[] | null>(null); // null = loading; [] = unavailable
  // The stored key is NEVER echoed back (write-only field) — but an empty input read as "no key set"
  // and sent the owner re-entering a key that was already live (263.1 round 7). Presence is the honest
  // middle: a green "key is set" note + a masked placeholder, value still never leaves the server.
  const [keySet, setKeySet] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/openai-models", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const models = Array.isArray(d?.models) ? (d.models as LiveModel[]).filter((m) => m.tools !== false) : [];
        setLive(models.length ? models : []);
      })
      .catch(() => setLive([]));
    fetch(`/api/project-config/env?keys=${modelEnvKey},OPENAI_API_KEY`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = d?.values?.[modelEnvKey];
        if (typeof v === "string" && v) { setCurrent(v); setModel(v); }
        const p = d?.present?.OPENAI_API_KEY;
        if (typeof p === "boolean") setKeySet(p);
      })
      .catch(() => {});
  }, [modelEnvKey]);

  async function saveKey() {
    if (!apiKey.trim()) return;
    setKeyBusy(true);
    try {
      const r = await fetch("/api/project-config/openai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      if (!r.ok) {
        const info = (await r.json().catch(() => null)) as { error?: string } | null;
        toast.error(info?.error ?? `Save failed (HTTP ${r.status})`);
        return;
      }
      setApiKey("");
      setKeySet(true);
      toast.success("OpenAI key saved — applying to every automation (a brief restart).");
    } finally {
      setKeyBusy(false);
    }
  }

  async function saveModel() {
    const value = model.trim();
    if (!value) return;
    setModelBusy(true);
    try {
      const r = await fetch("/api/project-config/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: modelEnvKey, value }),
      });
      if (!r.ok) {
        const info = (await r.json().catch(() => null)) as { error?: string } | null;
        toast.error(info?.error ?? `Save failed (HTTP ${r.status})`);
        return;
      }
      setCurrent(value);
      toast.success("Model saved — applying (a brief restart).");
    } finally {
      setModelBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="flex items-center gap-2 text-sm font-medium">
          OpenAI API key
          {keySet === true && (
            <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
              key is set — working
            </span>
          )}
        </label>
        <p className="text-xs text-muted-foreground">
          {keySet === true
            ? "A global key is already saved and powers every automation. Paste a new one only to replace it."
            : "One global key powers every automation. platform.openai.com → API keys → Create new secret key."}
        </p>
        <div className="flex gap-2">
          <Input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={keySet === true ? "sk-•••••••• (saved)" : "sk-…"} />
          <Button onClick={saveKey} disabled={keyBusy || !apiKey.trim()}>Save</Button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Model</label>
        <p className="text-xs text-muted-foreground">
          This automation&apos;s own model, from your live OpenAI account.{current ? ` Current: ${current}.` : ` Default: ${defaultModel}.`}
        </p>
        <div className="flex gap-2">
          {live === null ? (
            <span className="flex-1 text-sm text-muted-foreground">Loading models…</span>
          ) : live.length ? (
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Pick a model…" />
              </SelectTrigger>
              <SelectContent>
                {live.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.id}{m.recommended ? " ★" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder={`${defaultModel} (model list unavailable — type the id)`} autoComplete="off" />
          )}
          <Button onClick={saveModel} disabled={modelBusy || !model.trim()}>Save</Button>
        </div>
      </div>
    </div>
  );
}
