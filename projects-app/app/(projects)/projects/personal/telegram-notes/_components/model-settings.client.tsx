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

// Per-automation model selection (step 205 §L; step 207.19 owner rule): the model is ALWAYS picked from
// a LIVE dropdown fed by the real /v1/models list (/api/openai-models — the same mechanism as the
// Memory settings dropdown), never typed by hand against a stale hardcoded list. A manual input remains
// ONLY as the graceful fallback when the live list is unavailable (no key / OpenAI down). ONE global
// OpenAI key, the MODEL is per project — writes the runtime env key TELEGRAM_NOTES_MODEL (restart, no
// rebuild).
const MODELS_LINK = "https://developers.openai.com/api/docs/models";
type LiveModel = { id: string; family: string; recommended: boolean };

export function ModelSettings() {
  const [model, setModel] = useState("");
  const [current, setCurrent] = useState(""); // the model the automation runs on RIGHT NOW
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<LiveModel[] | null>(null); // null = loading; [] = unavailable
  useEffect(() => {
    fetch("/api/openai-models", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLive(Array.isArray(d?.models) && d.models.length ? (d.models as LiveModel[]) : []))
      .catch(() => setLive([]));
    // Show the CURRENT model (step 207.19 owner fix: the picker used to reopen as an empty
    // placeholder — the owner could not tell which model was active). Model ids are non-secret values.
    fetch("/api/project-config/env?keys=TELEGRAM_NOTES_MODEL", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = d?.values?.TELEGRAM_NOTES_MODEL;
        if (typeof v === "string" && v) { setCurrent(v); setModel(v); }
      })
      .catch(() => {});
  }, []);

  async function save() {
    const value = model.trim();
    if (!value) return;
    setBusy(true);
    try {
      const r = await fetch("/api/project-config/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "TELEGRAM_NOTES_MODEL", value }),
      });
      if (!r.ok) {
        const info = (await r.json().catch(() => null)) as { error?: string } | null;
        toast.error(info?.error ?? `Save failed (HTTP ${r.status})`);
        return;
      }
      setModel("");
      toast.success("Model saved — applying (a brief restart)");
    } catch {
      toast.error("Could not save the model (network error)");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Choose the OpenAI model this automation uses (one global key, a model per automation). The list
        is loaded LIVE from your OpenAI account. Not sure which to pick? See the{" "}
        <a href={MODELS_LINK} target="_blank" rel="noopener noreferrer" className="underline">
          OpenAI model guide
        </a>{" "}
        for the price / capability trade-off. This automation digitizes photos, so a vision-capable
        model is recommended. Default if unset: <code>gpt-4o-mini</code>.
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
                  {m.id}
                  {m.recommended ? " ★" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          // Live list unavailable (no key yet / OpenAI unreachable) — the manual input is the fallback.
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-4o-mini (model list unavailable — type the id)"
            autoComplete="off"
          />
        )}
        <Button onClick={save} disabled={busy || !model.trim()}>
          Save
        </Button>
      </div>
    </div>
  );
}
