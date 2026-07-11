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
type LiveModel = { id: string; family: string; recommended: boolean };

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

  useEffect(() => {
    fetch("/api/openai-models", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLive(Array.isArray(d?.models) && d.models.length ? (d.models as LiveModel[]) : []))
      .catch(() => setLive([]));
    fetch(`/api/project-config/env?keys=${modelEnvKey}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = d?.values?.[modelEnvKey];
        if (typeof v === "string" && v) { setCurrent(v); setModel(v); }
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
        <label className="text-sm font-medium">OpenAI API key</label>
        <p className="text-xs text-muted-foreground">
          One global key powers every automation. platform.openai.com → API keys → Create new secret key.
        </p>
        <div className="flex gap-2">
          <Input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-…" />
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
